import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";
import { createSampleCardPdfs } from "../lib/pdf/sample-generator";
import { personalizeCard } from "../lib/pdf/overlay";
import { validatePersonalizedPdf } from "../lib/pdf/validator";

describe("PDF Overlay Engine & Quality Preservation", () => {
  it("personalizes card without modifying master PDFs and preserves exact page dimensions", async () => {
    const { frontPdfBuffer, backPdfBuffer, width, height } = await createSampleCardPdfs();

    const initialFrontHash = crypto.createHash("sha256").update(frontPdfBuffer).digest("hex");
    const initialBackHash = crypto.createHash("sha256").update(backPdfBuffer).digest("hex");

    const elements = [
      {
        type: "NAME" as const,
        side: "FRONT" as const,
        x: 20,
        y: 40,
        width: 150,
        height: 20,
        fontFamily: "Helvetica-Bold",
        fontSize: 14,
        color: "#111827",
      },
      {
        type: "DESIGNATION" as const,
        side: "FRONT" as const,
        x: 20,
        y: 65,
        width: 150,
        height: 15,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#2563eb",
      },
      {
        type: "QR_CODE" as const,
        side: "BACK" as const,
        x: 150,
        y: 35,
        width: 70,
        height: 70,
      },
    ];

    const customer = {
      name: "Jane Doe",
      designation: "Principal Engineer",
      portfolioUrl: "https://janedoe.me",
      email: "jane@example.com",
    };

    const result = await personalizeCard({
      frontPdfBuffer,
      backPdfBuffer,
      elements,
      customer,
    });

    // 1. Master PDF files must remain 100% UNCHANGED (exact byte hash)
    const postFrontHash = crypto.createHash("sha256").update(frontPdfBuffer).digest("hex");
    const postBackHash = crypto.createHash("sha256").update(backPdfBuffer).digest("hex");
    assert.equal(postFrontHash, initialFrontHash);
    assert.equal(postBackHash, initialBackHash);

    // 2. Output Front PDF check
    const frontDoc = await PDFDocument.load(result.frontPdfBuffer);
    assert.equal(frontDoc.getPageCount(), 1);
    const frontPageSize = frontDoc.getPage(0).getSize();
    assert.equal(frontPageSize.width, width);
    assert.equal(frontPageSize.height, height);

    // 3. Output Back PDF check
    const backDoc = await PDFDocument.load(result.backPdfBuffer);
    assert.equal(backDoc.getPageCount(), 1);
    const backPageSize = backDoc.getPage(0).getSize();
    assert.equal(backPageSize.width, width);
    assert.equal(backPageSize.height, height);

    // 4. Combined PDF check
    const combinedDoc = await PDFDocument.load(result.combinedPdfBuffer);
    assert.equal(combinedDoc.getPageCount(), 2);

    // 5. Automated Validation & QR decodability report
    const validation = await validatePersonalizedPdf({
      masterBuffer: backPdfBuffer,
      outputBuffer: result.backPdfBuffer,
      selectedPageIndex: 0,
      elements,
      side: "BACK",
      customer,
      masterOriginalHash: initialBackHash,
    });

    assert.equal(validation.passed, true);
    assert.equal(validation.checks.qrDecodable, true);
    assert.equal(validation.details.decodedQrText, customer.portfolioUrl);
    assert.equal(validation.checks.masterUnchanged, true);
    assert.equal(validation.checks.dimensionsMatch, true);
  });

  it("personalizes card seamlessly when designation is omitted or null", async () => {
    const { frontPdfBuffer, backPdfBuffer } = await createSampleCardPdfs();

    const elements = [
      {
        type: "NAME" as const,
        side: "FRONT" as const,
        x: 20,
        y: 40,
        width: 150,
        height: 20,
        fontFamily: "Helvetica-Bold",
        fontSize: 14,
        color: "#111827",
      },
      {
        type: "DESIGNATION" as const,
        side: "FRONT" as const,
        x: 20,
        y: 65,
        width: 150,
        height: 15,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#2563eb",
      },
      {
        type: "QR_CODE" as const,
        side: "BACK" as const,
        x: 150,
        y: 35,
        width: 70,
        height: 70,
      },
    ];

    const customerWithoutDesignation = {
      name: "Sarah Connor",
      designation: null, // Omitted designation
      portfolioUrl: "https://sarahconnor.org",
    };

    const result = await personalizeCard({
      frontPdfBuffer,
      backPdfBuffer,
      elements,
      customer: customerWithoutDesignation,
    });

    assert.ok(result.frontPdfBuffer.length > 0);
    assert.ok(result.backPdfBuffer.length > 0);
    assert.ok(result.combinedPdfBuffer.length > 0);

    const doc = await PDFDocument.load(result.combinedPdfBuffer);
    assert.equal(doc.getPageCount(), 2);
  });
});
