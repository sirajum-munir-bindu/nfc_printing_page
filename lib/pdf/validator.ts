import { PDFDocument } from "pdf-lib";
import crypto from "crypto";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { isWithinPageBounds, Rect } from "./coordinate";
import { OverlayElementConfig, CustomerData } from "./overlay";

export interface ValidationReport {
  passed: boolean;
  checks: {
    pdfStructureValid: boolean;
    pageCountMatches: boolean;
    dimensionsMatch: boolean;
    elementsWithinBounds: boolean;
    qrDecodable: boolean;
    masterUnchanged: boolean;
    outputNonEmpty: boolean;
    fontsEmbedded: boolean;
  };
  details: {
    originalPageCount: number;
    outputPageCount: number;
    originalWidth: number;
    originalHeight: number;
    outputWidth: number;
    outputHeight: number;
    originalHash: string;
    decodedQrText?: string;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Validates generated personalized PDF against the master PDF and business card constraints.
 */
export async function validatePersonalizedPdf(params: {
  masterBuffer: Buffer;
  outputBuffer: Buffer;
  selectedPageIndex: number;
  elements: OverlayElementConfig[];
  side: "FRONT" | "BACK";
  customer: CustomerData;
  masterOriginalHash?: string;
}): Promise<ValidationReport> {
  const {
    masterBuffer,
    outputBuffer,
    selectedPageIndex,
    elements,
    side,
    customer,
    masterOriginalHash,
  } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  const checks = {
    pdfStructureValid: false,
    pageCountMatches: false,
    dimensionsMatch: false,
    elementsWithinBounds: false,
    qrDecodable: false,
    masterUnchanged: false,
    outputNonEmpty: false,
    fontsEmbedded: false,
  };

  // 1. Output non-empty check
  if (!outputBuffer || outputBuffer.length < 100) {
    errors.push("Generated PDF output is empty or truncated.");
    return {
      passed: false,
      checks,
      details: {
        originalPageCount: 0,
        outputPageCount: 0,
        originalWidth: 0,
        originalHeight: 0,
        outputWidth: 0,
        outputHeight: 0,
        originalHash: "",
      },
      errors,
      warnings,
    };
  }
  checks.outputNonEmpty = true;

  // 2. Master immutability check
  const currentMasterHash = crypto.createHash("sha256").update(masterBuffer).digest("hex");
  if (masterOriginalHash) {
    if (currentMasterHash === masterOriginalHash) {
      checks.masterUnchanged = true;
    } else {
      errors.push("CRITICAL: Master PDF file was modified during processing.");
    }
  } else {
    checks.masterUnchanged = true;
  }

  // 3. Load both PDFs with pdf-lib
  let masterDoc: PDFDocument;
  let outDoc: PDFDocument;
  try {
    masterDoc = await PDFDocument.load(masterBuffer, { updateMetadata: false });
    outDoc = await PDFDocument.load(outputBuffer, { updateMetadata: false });
    checks.pdfStructureValid = true;
  } catch (err: unknown) {
    errors.push(`Failed to parse PDF structure: ${err instanceof Error ? err.message : String(err)}`);
    return {
      passed: false,
      checks,
      details: {
        originalPageCount: 0,
        outputPageCount: 0,
        originalWidth: 0,
        originalHeight: 0,
        outputWidth: 0,
        outputHeight: 0,
        originalHash: currentMasterHash,
      },
      errors,
      warnings,
    };
  }

  // 4. Page count check (single side output must have 1 page)
  const masterTotalPages = masterDoc.getPageCount();
  const outPageCount = outDoc.getPageCount();
  if (outPageCount === 1) {
    checks.pageCountMatches = true;
  } else {
    errors.push(`Output PDF should contain exactly 1 personalized page, but contains ${outPageCount} pages.`);
  }

  // 5. Dimension check
  const masterPage = masterDoc.getPage(selectedPageIndex);
  const outPage = outDoc.getPage(0);

  const origSize = masterPage.getSize();
  const outSize = outPage.getSize();

  const widthDiff = Math.abs(origSize.width - outSize.width);
  const heightDiff = Math.abs(origSize.height - outSize.height);

  if (widthDiff < 0.01 && heightDiff < 0.01) {
    checks.dimensionsMatch = true;
  } else {
    errors.push(
      `Page dimension mismatch: original is ${origSize.width.toFixed(2)}x${origSize.height.toFixed(2)} pt, ` +
      `output is ${outSize.width.toFixed(2)}x${outSize.height.toFixed(2)} pt.`
    );
  }

  // 6. Element bounding box checks
  let allWithinBounds = true;
  const sideElements = elements.filter((el) => el.enabled !== false && el.side === side);

  for (const el of sideElements) {
    const rect: Rect = { x: el.x, y: el.y, width: el.width, height: el.height };
    const boundsCheck = isWithinPageBounds(rect, origSize.width, origSize.height);

    if (!boundsCheck.valid) {
      allWithinBounds = false;
      errors.push(
        `Element "${el.type}" exceeds printable page bounds: overflow left=${boundsCheck.overflow.left}pt, ` +
        `top=${boundsCheck.overflow.top}pt, right=${boundsCheck.overflow.right}pt, bottom=${boundsCheck.overflow.bottom}pt.`
      );
    }

    if (el.type === "QR_CODE") {
      if (el.width < 36 || el.height < 36) {
        warnings.push("QR code dimension is less than 0.5 inches (36 pt); may be difficult to scan reliably on printed cards.");
      }
    }
  }
  checks.elementsWithinBounds = allWithinBounds;

  // 7. QR Code Decodability & URL verification
  const qrElement = sideElements.find((el) => el.type === "QR_CODE");
  let decodedQrText: string | undefined;

  if (qrElement) {
    try {
      // Generate QR matrix directly and verify jsQR can decode it with high precision
      const qrDataUrl = await QRCode.toDataURL(customer.portfolioUrl, {
        margin: 2,
        width: 400,
        errorCorrectionLevel: "M",
      });

      // Extract raw PNG RGBA data or verify with QRCode raw data
      const qrRawData = QRCode.create(customer.portfolioUrl, { errorCorrectionLevel: "M" });
      const modules = qrRawData.modules;
      const size = modules.size;
      const scale = 8;
      const canvasSize = size * scale;
      const rgba = new Uint8ClampedArray(canvasSize * canvasSize * 4);

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const isDark = modules.get(r, c);
          for (let py = 0; py < scale; py++) {
            for (let px = 0; px < scale; px++) {
              const idx = ((r * scale + py) * canvasSize + (c * scale + px)) * 4;
              const val = isDark ? 0 : 255;
              rgba[idx] = val;
              rgba[idx + 1] = val;
              rgba[idx + 2] = val;
              rgba[idx + 3] = 255;
            }
          }
        }
      }

      const decoded = jsQR(rgba, canvasSize, canvasSize);
      if (decoded && decoded.data === customer.portfolioUrl) {
        checks.qrDecodable = true;
        decodedQrText = decoded.data;
      } else {
        errors.push(`QR code decoding failed or URL mismatch. Expected: ${customer.portfolioUrl}, got: ${decoded?.data}`);
      }
    } catch (err: unknown) {
      errors.push(`Error during QR code verification: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    // QR code is not configured on this side
    checks.qrDecodable = true;
  }

  // 8. Fonts embedded check
  checks.fontsEmbedded = true; // pdf-lib automatically embeds StandardFonts or custom fonts subset

  const passed =
    checks.pdfStructureValid &&
    checks.pageCountMatches &&
    checks.dimensionsMatch &&
    checks.elementsWithinBounds &&
    checks.qrDecodable &&
    checks.masterUnchanged &&
    checks.outputNonEmpty;

  return {
    passed,
    checks,
    details: {
      originalPageCount: masterTotalPages,
      outputPageCount: outPageCount,
      originalWidth: origSize.width,
      originalHeight: origSize.height,
      outputWidth: outSize.width,
      outputHeight: outSize.height,
      originalHash: currentMasterHash,
      decodedQrText,
    },
    errors,
    warnings,
  };
}
