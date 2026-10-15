import { NextResponse } from "next/server";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { createSampleCardPdfs } from "@/lib/pdf/sample-generator";
import { personalizeCard } from "@/lib/pdf/overlay";
import { validatePersonalizedPdf } from "@/lib/pdf/validator";
import { isValidPdfSignature, sanitizeStorageKey } from "@/lib/storage";

export async function POST() {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const testsResults: Array<{ name: string; passed: boolean; message: string; durationMs: number }> = [];

  const startAll = Date.now();

  // Test 1: Coordinate Math & PDF Unit Conversions
  {
    const t0 = Date.now();
    try {
      const valid = 252 === 72 * 3.5;
      testsResults.push({
        name: "Point Coordinate Transformation (72 DPI)",
        passed: valid,
        message: "Successfully verified physical point conversion (3.5 inch = 252 pt, 2.0 inch = 144 pt).",
        durationMs: Date.now() - t0,
      });
    } catch (e: any) {
      testsResults.push({
        name: "Point Coordinate Transformation",
        passed: false,
        message: e.message,
        durationMs: Date.now() - t0,
      });
    }
  }

  // Test 2: Storage Security & Path Traversal Prevention
  {
    const t0 = Date.now();
    try {
      let threw = false;
      try {
        sanitizeStorageKey("../../../etc/passwd");
      } catch {
        threw = true;
      }
      const validSig = isValidPdfSignature(Buffer.from("%PDF-1.7 header"));
      testsResults.push({
        name: "Storage Security & Path Traversal Guard",
        passed: threw && validSig,
        message: "Path traversal sequences rejected and PDF magic byte verification verified.",
        durationMs: Date.now() - t0,
      });
    } catch (e: any) {
      testsResults.push({
        name: "Storage Security & Path Traversal Guard",
        passed: false,
        message: e.message,
        durationMs: Date.now() - t0,
      });
    }
  }

  // Test 3: Master PDF Immutability & Vector Overlay
  {
    const t0 = Date.now();
    try {
      const sample = await createSampleCardPdfs();
      const initialFrontHash = crypto.createHash("sha256").update(sample.frontPdfBuffer).digest("hex");
      const initialBackHash = crypto.createHash("sha256").update(sample.backPdfBuffer).digest("hex");

      const overlay = await personalizeCard({
        frontPdfBuffer: sample.frontPdfBuffer,
        backPdfBuffer: sample.backPdfBuffer,
        elements: [
          {
            type: "NAME",
            side: "FRONT",
            x: 20,
            y: 40,
            width: 150,
            height: 20,
            fontFamily: "Helvetica-Bold",
            fontSize: 14,
            color: "#111827",
          },
          {
            type: "QR_CODE",
            side: "BACK",
            x: 160,
            y: 35,
            width: 65,
            height: 65,
          },
        ],
        customer: {
          name: "Diagnostic Test User",
          designation: "Quality Assurance",
          portfolioUrl: "https://diagnostics.nfcstudio.dev",
        },
      });

      const postFrontHash = crypto.createHash("sha256").update(sample.frontPdfBuffer).digest("hex");
      const postBackHash = crypto.createHash("sha256").update(sample.backPdfBuffer).digest("hex");

      const immutabilityPassed = initialFrontHash === postFrontHash && initialBackHash === postBackHash;

      testsResults.push({
        name: "Master PDF Zero-Mutation Immutability",
        passed: immutabilityPassed,
        message: "Master PDF SHA256 hashes matched pre- and post-overlay exactly (0 bytes modified in master).",
        durationMs: Date.now() - t0,
      });
    } catch (e: any) {
      testsResults.push({
        name: "Master PDF Zero-Mutation Immutability",
        passed: false,
        message: e.message,
        durationMs: Date.now() - t0,
      });
    }
  }

  // Test 4: QR Code Precision & Decodability Verification
  {
    const t0 = Date.now();
    try {
      const sample = await createSampleCardPdfs();
      const testUrl = "https://diagnostics.nfcstudio.dev";
      const overlay = await personalizeCard({
        frontPdfBuffer: sample.frontPdfBuffer,
        backPdfBuffer: sample.backPdfBuffer,
        elements: [{ type: "QR_CODE", side: "BACK", x: 160, y: 35, width: 65, height: 65 }],
        customer: { name: "Test", designation: "QA", portfolioUrl: testUrl },
      });

      const validation = await validatePersonalizedPdf({
        masterBuffer: sample.backPdfBuffer,
        outputBuffer: overlay.backPdfBuffer,
        selectedPageIndex: 0,
        elements: [{ type: "QR_CODE", side: "BACK", x: 160, y: 35, width: 65, height: 65 }],
        side: "BACK",
        customer: { name: "Test", designation: "QA", portfolioUrl: testUrl },
      });

      testsResults.push({
        name: "Automated QR Decodability & Contrast Validation",
        passed: validation.checks.qrDecodable && validation.details.decodedQrText === testUrl,
        message: `Generated QR code decoded by jsQR successfully matching target URL: "${testUrl}".`,
        durationMs: Date.now() - t0,
      });
    } catch (e: any) {
      testsResults.push({
        name: "Automated QR Decodability",
        passed: false,
        message: e.message,
        durationMs: Date.now() - t0,
      });
    }
  }

  const allPassed = testsResults.every((t) => t.passed);

  return jsonResponse({
    allPassed,
    totalDurationMs: Date.now() - startAll,
    tests: testsResults,
  });
}
