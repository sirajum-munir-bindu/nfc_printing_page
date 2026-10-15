import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-helper";
import { getPdfBuffer } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await context.params;
    const type = req.nextUrl.searchParams.get("type") || "combined";

    const generatedCard = await prisma.generatedCard.findUnique({
      where: { id },
      include: {
        order: {
          include: { customer: true },
        },
      },
    });

    if (!generatedCard) {
      return errorResponse("Generated card not found", 404);
    }

    const customerSlug = (generatedCard.order.customer.name || "card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    // 1. Export Front PDF (Single Side)
    if (type === "front") {
      const buffer = await getPdfBuffer(generatedCard.frontPdfStorageKey, "generated");
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${customerSlug}-front.pdf"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    // 2. Export Back PDF (Single Side)
    if (type === "back") {
      const buffer = await getPdfBuffer(generatedCard.backPdfStorageKey, "generated");
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${customerSlug}-back.pdf"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    // 3. Export ZIP (Optional package)
    if (type === "zip") {
      const frontBuf = await getPdfBuffer(generatedCard.frontPdfStorageKey, "generated");
      const backBuf = await getPdfBuffer(generatedCard.backPdfStorageKey, "generated");

      const zip = new JSZip();
      zip.file(`${customerSlug}-front.pdf`, frontBuf);
      zip.file(`${customerSlug}-back.pdf`, backBuf);

      const manifest = {
        customer: generatedCard.order.customer.name,
        designation: generatedCard.order.customer.designation,
        portfolioUrl: generatedCard.order.customer.portfolioUrl,
        orderReference: generatedCard.order.orderReference,
        generatedAt: generatedCard.createdAt,
        specifications: {
          format: "Vector PDF (PDF/X compliant)",
          rasterization: "None (zero background resampling)",
        },
      };
      zip.file("print-manifest.json", JSON.stringify(manifest, null, 2));

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${customerSlug}-nfc-card.zip"`,
          "Content-Length": zipBuffer.length.toString(),
        },
      });
    }

    // 4. Export Combined PDF (Front and Back Together in 1 File - Default & Recommended)
    let combinedBuf: Buffer;
    try {
      if (generatedCard.combinedPdfStorageKey) {
        combinedBuf = await getPdfBuffer(generatedCard.combinedPdfStorageKey, "generated");
      } else {
        throw new Error("No stored combined key, generating dynamically");
      }
    } catch {
      // Merge Front and Back into a combined document on-the-fly
      const frontBuf = await getPdfBuffer(generatedCard.frontPdfStorageKey, "generated");
      const backBuf = await getPdfBuffer(generatedCard.backPdfStorageKey, "generated");

      const combinedDoc = await PDFDocument.create();
      const frontDoc = await PDFDocument.load(frontBuf);
      const backDoc = await PDFDocument.load(backBuf);

      const [frontPage] = await combinedDoc.copyPages(frontDoc, [0]);
      const [backPage] = await combinedDoc.copyPages(backDoc, [0]);

      combinedDoc.addPage(frontPage);
      combinedDoc.addPage(backPage);

      const combinedBytes = await combinedDoc.save();
      combinedBuf = Buffer.from(combinedBytes);
    }

    return new NextResponse(new Uint8Array(combinedBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${customerSlug}-front-and-back.pdf"`,
        "Content-Length": combinedBuf.length.toString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Export failed";
    return errorResponse(msg, 500);
  }
}
