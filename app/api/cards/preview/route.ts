import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { getPdfBuffer } from "@/lib/storage";
import { personalizeCard } from "@/lib/pdf/overlay";

export async function POST(req: NextRequest) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const { templateId, customer } = body;

    if (!templateId || !customer) {
      return errorResponse("Template ID and Customer details are required", 400);
    }

    if (!customer.name || !customer.portfolioUrl) {
      return errorResponse("Customer name and portfolio URL are required", 400);
    }

    const template = await prisma.cardTemplate.findUnique({
      where: { id: templateId },
      include: { elements: true },
    });

    if (!template) {
      return errorResponse("Template not found", 404);
    }

    const frontPdfBuffer = await getPdfBuffer(template.frontPdfStorageKey, "master");
    const backPdfBuffer = await getPdfBuffer(template.backPdfStorageKey, "master");

    const overlayResult = await personalizeCard({
      frontPdfBuffer,
      backPdfBuffer,
      frontPageIndex: template.frontPageIndex,
      backPageIndex: template.backPageIndex,
      elements: template.elements.map((el) => ({
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
      })),
      customer: {
        name: customer.name,
        designation: customer.designation,
        portfolioUrl: customer.portfolioUrl,
        email: customer.email,
      },
    });

    return jsonResponse({
      qrCodeDataUrl: overlayResult.qrCodeDataUrl,
      frontPdfBase64: overlayResult.frontPdfBuffer.toString("base64"),
      backPdfBase64: overlayResult.backPdfBuffer.toString("base64"),
      combinedPdfBase64: overlayResult.combinedPdfBuffer.toString("base64"),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Preview generation failed";
    return errorResponse(msg, 500);
  }
}
