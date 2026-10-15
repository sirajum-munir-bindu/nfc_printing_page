import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { getPdfBuffer, savePdfFile } from "@/lib/storage";
import { personalizeCard, validateUrl } from "@/lib/pdf/overlay";
import { validatePersonalizedPdf } from "@/lib/pdf/validator";

export async function POST(req: NextRequest) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const {
      templateId,
      customerId,
      customerData,
      orderReference,
      notes,
    } = body;

    if (!templateId) {
      return errorResponse("Template ID is required", 400);
    }

    // Resolve customer
    let targetCustomer;
    if (customerId) {
      targetCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!targetCustomer) {
        return errorResponse("Customer not found", 404);
      }
    } else if (customerData) {
      if (!customerData.name || !customerData.portfolioUrl) {
        return errorResponse("Customer Name and Portfolio URL are required", 400);
      }
      const validatedUrl = validateUrl(customerData.portfolioUrl);
      targetCustomer = await prisma.customer.create({
        data: {
          name: customerData.name.trim(),
          designation: customerData.designation ? customerData.designation.trim() : null,
          portfolioUrl: validatedUrl,
          email: customerData.email ? customerData.email.trim() : null,
        },
      });
    } else {
      return errorResponse("Customer details are required", 400);
    }

    // Load template
    const template = await prisma.cardTemplate.findUnique({
      where: { id: templateId },
      include: { elements: true },
    });

    if (!template) {
      return errorResponse("Template not found", 404);
    }

    // Load master PDF buffers
    const frontMasterBuffer = await getPdfBuffer(template.frontPdfStorageKey, "master");
    const backMasterBuffer = await getPdfBuffer(template.backPdfStorageKey, "master");

    const frontOriginalHash = crypto.createHash("sha256").update(frontMasterBuffer).digest("hex");
    const backOriginalHash = crypto.createHash("sha256").update(backMasterBuffer).digest("hex");

    const overlayElements = template.elements.map((el) => ({
      id: el.id,
      type: el.type,
      side: el.side,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      color: el.color,
      alignment: el.alignment as any,
      enabled: el.enabled,
      style: (el.style as Record<string, unknown>) || {},
    }));

    // Perform vector personalization overlay
    const overlayResult = await personalizeCard({
      frontPdfBuffer: frontMasterBuffer,
      backPdfBuffer: backMasterBuffer,
      frontPageIndex: template.frontPageIndex,
      backPageIndex: template.backPageIndex,
      elements: overlayElements,
      customer: {
        name: targetCustomer.name,
        designation: targetCustomer.designation,
        portfolioUrl: targetCustomer.portfolioUrl,
        email: targetCustomer.email,
      },
    });

    // Validate generated Front PDF
    const frontValidation = await validatePersonalizedPdf({
      masterBuffer: frontMasterBuffer,
      outputBuffer: overlayResult.frontPdfBuffer,
      selectedPageIndex: template.frontPageIndex,
      elements: overlayElements,
      side: "FRONT",
      customer: targetCustomer,
      masterOriginalHash: frontOriginalHash,
    });

    // Validate generated Back PDF
    const backValidation = await validatePersonalizedPdf({
      masterBuffer: backMasterBuffer,
      outputBuffer: overlayResult.backPdfBuffer,
      selectedPageIndex: template.backPageIndex,
      elements: overlayElements,
      side: "BACK",
      customer: targetCustomer,
      masterOriginalHash: backOriginalHash,
    });

    if (!frontValidation.passed || !backValidation.passed) {
      const allErrors = [...frontValidation.errors, ...backValidation.errors];
      return errorResponse(
        `PDF Quality Validation failed: ${allErrors.join("; ")}`,
        422,
        { frontValidation, backValidation }
      );
    }

    // Save personalized files to secure private generated storage
    const savedFront = await savePdfFile(overlayResult.frontPdfBuffer, "generated", "front_card");
    const savedBack = await savePdfFile(overlayResult.backPdfBuffer, "generated", "back_card");
    const savedCombined = await savePdfFile(overlayResult.combinedPdfBuffer, "generated", "combined_card");

    // Create Order Reference if not provided
    const ref = orderReference?.trim() || `ORD-${Date.now().toString().slice(-6)}`;

    // Create Order and GeneratedCard with full immutable configuration snapshot
    const snapshot = {
      templateId: template.id,
      templateName: template.name,
      templateConfiguration: template.configuration,
      frontPageDimensions: {
        width: template.frontPageWidth,
        height: template.frontPageHeight,
      },
      backPageDimensions: {
        width: template.backPageWidth,
        height: template.backPageHeight,
      },
      elements: template.elements,
      customer: {
        id: targetCustomer.id,
        name: targetCustomer.name,
        designation: targetCustomer.designation,
        portfolioUrl: targetCustomer.portfolioUrl,
        email: targetCustomer.email,
      },
      validation: {
        front: frontValidation,
        back: backValidation,
      },
      generatedAt: new Date().toISOString(),
    };

    const order = await prisma.cardOrder.create({
      data: {
        customerId: targetCustomer.id,
        templateId: template.id,
        status: "COMPLETED",
        orderReference: ref,
        notes: notes || null,
        generatedCards: {
          create: {
            frontPdfStorageKey: savedFront.key,
            backPdfStorageKey: savedBack.key,
            combinedPdfStorageKey: savedCombined.key,
            configurationSnapshot: JSON.parse(JSON.stringify(snapshot)),
          },
        },
      },
      include: {
        customer: true,
        template: true,
        generatedCards: true,
      },
    });

    const generatedCard = (order as any).generatedCards[0];

    return jsonResponse(
      {
        message: "Card generated and verified successfully",
        order,
        generatedCard,
        validation: {
          front: frontValidation,
          back: backValidation,
        },
        downloads: {
          frontUrl: `/api/cards/export/${generatedCard.id}?type=front`,
          backUrl: `/api/cards/export/${generatedCard.id}?type=back`,
          combinedUrl: `/api/cards/export/${generatedCard.id}?type=combined`,
          zipUrl: `/api/cards/export/${generatedCard.id}?type=zip`,
        },
      },
      201
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Card generation failed";
    return errorResponse(msg, 500);
  }
}
