import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Creates professional sample blank NFC business card PDFs for testing and out-of-the-box demoing.
 * Preserves pure vector lines, gradients, and artwork without any rasterization.
 */
export async function createSampleCardPdfs(): Promise<{
  frontPdfBuffer: Buffer;
  backPdfBuffer: Buffer;
  width: number;
  height: number;
}> {
  // US Standard Business Card: 3.5 inches x 2.0 inches = 252 x 144 points
  const width = 252;
  const height = 144;

  // 1. FRONT CARD MASTER PDF (Blank layout with modern geometric vector accents)
  const frontDoc = await PDFDocument.create();
  const frontPage = frontDoc.addPage([width, height]);
  const font = await frontDoc.embedFont(StandardFonts.HelveticaBold);

  // Background base
  frontPage.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.97, 0.98, 1.0), // very light ice blue / white
  });

  // Modern corporate vector header / geometric accents
  frontPage.drawRectangle({
    x: 0,
    y: height - 16,
    width,
    height: 16,
    color: rgb(0.08, 0.15, 0.35), // Deep navy
  });

  frontPage.drawRectangle({
    x: 0,
    y: height - 20,
    width: width * 0.45,
    height: 4,
    color: rgb(0.2, 0.55, 0.95), // Accent blue
  });

  // Vector card brand watermark / icon
  frontPage.drawText("NFC CARD STUDIO", {
    x: 18,
    y: height - 12,
    size: 7,
    font,
    color: rgb(1, 1, 1),
  });

  // Subtle bottom accent
  frontPage.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 6,
    color: rgb(0.08, 0.15, 0.35),
  });

  const frontPdfBytes = await frontDoc.save();

  // 2. BACK CARD MASTER PDF (Blank layout with designated QR & NFC chip zone)
  const backDoc = await PDFDocument.create();
  const backPage = backDoc.addPage([width, height]);
  const regularFont = await backDoc.embedFont(StandardFonts.Helvetica);

  // Dark modern slate background
  backPage.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.06, 0.09, 0.16), // Dark slate
  });

  // NFC Wave icon / vector indicator
  backPage.drawRectangle({
    x: 20,
    y: height - 28,
    width: 24,
    height: 16,
    color: rgb(0.12, 0.18, 0.28),
  });

  backPage.drawText("NFC TAP", {
    x: 23,
    y: height - 23,
    size: 5,
    font,
    color: rgb(0.4, 0.7, 1.0),
  });

  // Subtle accent line
  backPage.drawRectangle({
    x: width - 8,
    y: 0,
    width: 8,
    height,
    color: rgb(0.2, 0.55, 0.95),
  });

  backPage.drawText("INSTANT DIGITAL CONTACT", {
    x: 20,
    y: 16,
    size: 6,
    font: regularFont,
    color: rgb(0.6, 0.7, 0.8),
  });

  const backPdfBytes = await backDoc.save();

  return {
    frontPdfBuffer: Buffer.from(frontPdfBytes),
    backPdfBuffer: Buffer.from(backPdfBytes),
    width,
    height,
  };
}
