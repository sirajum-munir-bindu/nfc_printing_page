import { PDFDocument } from "pdf-lib";
import { pointsToMm, pointsToInches } from "./coordinate";

export interface PageMetadata {
  pageIndex: number;
  width: number; // in PDF points
  height: number; // in PDF points
  widthMm: number;
  heightMm: number;
  widthInches: number;
  heightInches: number;
  rotation: number;
  orientation: "landscape" | "portrait" | "square";
  isStandardBusinessCard: boolean;
  aspectRatio: number;
}

export interface PdfInspectionResult {
  pageCount: number;
  pages: PageMetadata[];
  isEncrypted: boolean;
  hasForms: boolean;
  warnings: string[];
  suggestedBleedMm?: number;
}

/**
 * Inspects a PDF buffer to extract dimensions, rotation, pages, and compatibility warnings.
 */
export async function inspectPdfBuffer(pdfBuffer: Buffer): Promise<PdfInspectionResult> {
  const warnings: string[] = [];

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("encrypt") || msg.toLowerCase().includes("password")) {
      return {
        pageCount: 0,
        pages: [],
        isEncrypted: true,
        hasForms: false,
        warnings: ["The PDF is password protected or encrypted and cannot be personalized safely."],
      };
    }
    throw new Error(`Failed to parse PDF document: ${msg}`);
  }

  const pageCount = pdfDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error("The uploaded PDF has 0 pages.");
  }

  // Check for forms
  const form = pdfDoc.getForm?.();
  const hasForms = form ? form.getFields().length > 0 : false;
  if (hasForms) {
    warnings.push("PDF contains interactive form fields. Static vector overlay will be applied.");
  }

  const pages: PageMetadata[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const size = page.getSize();
    const rotation = page.getRotation().angle;

    const width = Number(size.width.toFixed(2));
    const height = Number(size.height.toFixed(2));
    const widthMm = pointsToMm(width);
    const heightMm = pointsToMm(height);
    const widthInches = pointsToInches(width);
    const heightInches = pointsToInches(height);

    const orientation =
      width > height ? "landscape" : height > width ? "portrait" : "square";
    const aspectRatio = Number((width / height).toFixed(2));

    // Standard business card checks:
    // US standard: 3.5 x 2.0 inches (252 x 144 pt), or with bleed 3.75 x 2.25 inches (270 x 162 pt)
    // CR80: 85.6 x 53.98 mm (~242.6 x 153.0 pt)
    const isUsStandard =
      (Math.abs(widthInches - 3.5) < 0.3 && Math.abs(heightInches - 2.0) < 0.3) ||
      (Math.abs(widthInches - 2.0) < 0.3 && Math.abs(heightInches - 3.5) < 0.3);
    const isCr80 =
      (Math.abs(widthMm - 85.6) < 4 && Math.abs(heightMm - 54) < 4) ||
      (Math.abs(widthMm - 54) < 4 && Math.abs(heightMm - 85.6) < 4);

    const isStandardBusinessCard = isUsStandard || isCr80;

    if (!isStandardBusinessCard && widthInches > 5 && heightInches > 7) {
      warnings.push(
        `Page ${i + 1} size (${widthMm} x ${heightMm} mm) appears significantly larger than standard business card size.`
      );
    }

    pages.push({
      pageIndex: i,
      width,
      height,
      widthMm,
      heightMm,
      widthInches,
      heightInches,
      rotation,
      orientation,
      isStandardBusinessCard,
      aspectRatio,
    });
  }

  return {
    pageCount,
    pages,
    isEncrypted: false,
    hasForms,
    warnings,
  };
}
