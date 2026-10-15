import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { editorToPdfCoords, Rect } from "./coordinate";

export interface OverlayElementConfig {
  id?: string;
  type: "NAME" | "DESIGNATION" | "QR_CODE";
  side: "FRONT" | "BACK";
  x: number; // in PDF points from top-left
  y: number; // in PDF points from top-left
  width: number; // in PDF points
  height: number; // in PDF points
  fontFamily?: string;
  fontSize?: number;
  color?: string; // hex "#000000"
  alignment?: "left" | "center" | "right";
  enabled?: boolean;
  style?: Record<string, unknown>;
}

export interface CustomerData {
  name: string;
  designation?: string | null;
  portfolioUrl: string;
  email?: string | null;
}

export interface OverlayOptions {
  frontPdfBuffer: Buffer;
  backPdfBuffer: Buffer;
  frontPageIndex?: number;
  backPageIndex?: number;
  elements: OverlayElementConfig[];
  customer: CustomerData;
}

export interface OverlayResult {
  frontPdfBuffer: Buffer;
  backPdfBuffer: Buffer;
  combinedPdfBuffer: Buffer;
  qrCodeDataUrl: string;
}

/**
 * Parses Hex color (e.g. #FF0000 or #333) into pdf-lib rgb values (0.0 - 1.0)
 */
export function parseHexColor(hex: string | undefined): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0 };
  }

  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }

  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };

  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Validates portfolio URL
 */
export function validateUrl(url: string): string {
  if (!url || typeof url !== "string") {
    throw new Error("Portfolio URL is required");
  }

  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid URL protocol: Must use http:// or https://");
    }
    return parsed.toString();
  } catch (err: unknown) {
    throw new Error(`Invalid portfolio URL provided: "${trimmed}"`);
  }
}

/**
 * Generates high-resolution, high-contrast QR code PNG buffer.
 * Uses print-ready high density (1024x1024 minimum) and standard error correction.
 */
export async function generateQrCodeBuffer(
  rawUrl: string,
  options?: {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    colorDark?: string;
    colorLight?: string;
  }
): Promise<{ buffer: Buffer; dataUrl: string }> {
  const validated = validateUrl(rawUrl);

  const qrOptions: QRCode.QRCodeToBufferOptions = {
    errorCorrectionLevel: options?.errorCorrectionLevel || "M",
    margin: options?.margin !== undefined ? options.margin : 2,
    width: 1024, // High resolution for crisp printing
    color: {
      dark: options?.colorDark || "#000000",
      light: options?.colorLight || "#FFFFFF",
    },
  };

  const buffer = await QRCode.toBuffer(validated, qrOptions);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

  return { buffer, dataUrl };
}

/**
 * Resolves standard pdf-lib font based on family name and style
 */
export async function resolveFont(pdfDoc: PDFDocument, fontFamily?: string): Promise<PDFFont> {
  const lower = (fontFamily || "").toLowerCase();

  if (lower.includes("bold") && lower.includes("times")) {
    return pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  }
  if (lower.includes("times")) {
    return pdfDoc.embedFont(StandardFonts.TimesRoman);
  }
  if (lower.includes("bold") && lower.includes("courier")) {
    return pdfDoc.embedFont(StandardFonts.CourierBold);
  }
  if (lower.includes("courier") || lower.includes("mono")) {
    return pdfDoc.embedFont(StandardFonts.Courier);
  }
  if (lower.includes("bold")) {
    return pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  return pdfDoc.embedFont(StandardFonts.Helvetica);
}

/**
 * Renders text element onto a PDF page with correct coordinate conversion and alignment.
 */
export function drawTextElement(
  page: PDFPage,
  font: PDFFont,
  text: string,
  element: OverlayElementConfig,
  pageHeight: number
) {
  if (!text || !text.trim()) return;

  const fontSize = element.fontSize || 12;
  const color = parseHexColor(element.color);
  const alignment = element.alignment || "left";

  // Measure text width using font metrics
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const fontHeight = font.heightAtSize(fontSize);

  // Convert top-left editor coords to PDF bottom-left coords
  const pdfCoords = editorToPdfCoords(
    {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
    pageHeight
  );

  let targetX = pdfCoords.x;

  if (alignment === "center") {
    targetX = pdfCoords.x + (element.width - textWidth) / 2;
  } else if (alignment === "right") {
    targetX = pdfCoords.x + element.width - textWidth;
  }

  // Calculate baseline Y within the bounding box
  // Vertically center text in the bounding box
  const targetY = pdfCoords.y + (element.height - fontHeight) / 2 + fontHeight * 0.15;

  page.drawText(text, {
    x: targetX,
    y: targetY,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
    maxWidth: element.width,
  });
}

/**
 * Personalizes a single side PDF without modifying or rasterizing the master PDF.
 */
export async function personalizeSingleSidePdf(
  masterPdfBuffer: Buffer,
  pageIndex: number,
  side: "FRONT" | "BACK",
  elements: OverlayElementConfig[],
  customer: CustomerData,
  qrBuffer?: Buffer
): Promise<Buffer> {
  // Load master PDF with copy semantics so master buffer is untouched
  const sourceDoc = await PDFDocument.load(masterPdfBuffer, { updateMetadata: false });
  const totalPages = sourceDoc.getPageCount();

  if (pageIndex < 0 || pageIndex >= totalPages) {
    throw new Error(`Configured page index ${pageIndex} is out of bounds (document has ${totalPages} pages)`);
  }

  // Create a clean destination document and copy ONLY the selected page
  // This ensures zero mutation to the source document and preserves original vector artwork
  const outDoc = await PDFDocument.create();
  const [copiedPage] = await outDoc.copyPages(sourceDoc, [pageIndex]);
  const page = outDoc.addPage(copiedPage);

  const { height: pageHeight } = page.getSize();

  // Filter elements configured for this specific side
  const activeElements = elements.filter(
    (el) => el.enabled !== false && el.side === side
  );

  // Embed font
  const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

  // Render text elements
  for (const el of activeElements) {
    if (el.type === "NAME") {
      const font = el.fontFamily?.toLowerCase().includes("bold") ? helveticaBold : helveticaFont;
      drawTextElement(page, font, customer.name, el, pageHeight);
    } else if (el.type === "DESIGNATION") {
      const font = el.fontFamily?.toLowerCase().includes("bold") ? helveticaBold : helveticaFont;
      drawTextElement(page, font, customer.designation || "", el, pageHeight);
    } else if (el.type === "QR_CODE" && qrBuffer) {
      // Embed QR PNG image
      const qrImage = await outDoc.embedPng(qrBuffer);

      // Keep QR square (use min dimension if width/height differ)
      const qrSize = Math.min(el.width, el.height);
      const offsetX = (el.width - qrSize) / 2;
      const offsetY = (el.height - qrSize) / 2;

      const pdfCoords = editorToPdfCoords(
        {
          x: el.x + offsetX,
          y: el.y + offsetY,
          width: qrSize,
          height: qrSize,
        },
        pageHeight
      );

      page.drawImage(qrImage, {
        x: pdfCoords.x,
        y: pdfCoords.y,
        width: qrSize,
        height: qrSize,
      });
    }
  }

  const outputBytes = await outDoc.save();
  return Buffer.from(outputBytes);
}

/**
 * Core Personalization Engine: processes Front, Back, and builds Combined PDF.
 */
export async function personalizeCard(options: OverlayOptions): Promise<OverlayResult> {
  const {
    frontPdfBuffer,
    backPdfBuffer,
    frontPageIndex = 0,
    backPageIndex = 0,
    elements,
    customer,
  } = options;

  // 1. Generate high-resolution QR code for the portfolio URL
  const { buffer: qrBuffer, dataUrl: qrCodeDataUrl } = await generateQrCodeBuffer(customer.portfolioUrl);

  // 2. Personalize Front side
  const personalizedFront = await personalizeSingleSidePdf(
    frontPdfBuffer,
    frontPageIndex,
    "FRONT",
    elements,
    customer,
    qrBuffer
  );

  // 3. Personalize Back side
  const personalizedBack = await personalizeSingleSidePdf(
    backPdfBuffer,
    backPageIndex,
    "BACK",
    elements,
    customer,
    qrBuffer
  );

  // 4. Create Combined PDF (Front page followed by Back page)
  const combinedDoc = await PDFDocument.create();
  const frontDoc = await PDFDocument.load(personalizedFront);
  const backDoc = await PDFDocument.load(personalizedBack);

  const [frontPage] = await combinedDoc.copyPages(frontDoc, [0]);
  const [backPage] = await combinedDoc.copyPages(backDoc, [0]);

  combinedDoc.addPage(frontPage);
  combinedDoc.addPage(backPage);

  const combinedBytes = await combinedDoc.save();

  return {
    frontPdfBuffer: personalizedFront,
    backPdfBuffer: personalizedBack,
    combinedPdfBuffer: Buffer.from(combinedBytes),
    qrCodeDataUrl,
  };
}
