import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidPdfSignature,
  sanitizeStorageKey,
  savePdfFile,
  getPdfBuffer,
  deletePdfFile,
} from "../lib/storage";

describe("Secure Storage & PDF Validation", () => {
  it("validates PDF magic bytes signature accurately", () => {
    // Valid PDF header
    const validPdfBuffer = Buffer.from("%PDF-1.7\nSample content");
    assert.equal(isValidPdfSignature(validPdfBuffer), true);

    // Invalid non-PDF formats
    const pngBuffer = Buffer.from("\x89PNG\r\n\x1a\nSome PNG data");
    assert.equal(isValidPdfSignature(pngBuffer), false);

    const txtBuffer = Buffer.from("Hello world, this is a plain text file.");
    assert.equal(isValidPdfSignature(txtBuffer), false);

    const emptyBuffer = Buffer.alloc(0);
    assert.equal(isValidPdfSignature(emptyBuffer), false);
  });

  it("prevents directory traversal attacks in storage keys", () => {
    assert.throws(() => sanitizeStorageKey("../../../etc/passwd"));
    assert.throws(() => sanitizeStorageKey("..\\..\\windows\\system32"));
    assert.throws(() => sanitizeStorageKey("/etc/hosts"));

    const safeKey = sanitizeStorageKey("card_front_123e4567-e89b-12d3-a456-426614174000.pdf");
    assert.equal(safeKey, "card_front_123e4567-e89b-12d3-a456-426614174000.pdf");
  });

  it("saves, retrieves and cleans up PDF files safely", async () => {
    const validPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    const saved = await savePdfFile(validPdfBuffer, "temp", "test_file");

    assert.ok(saved.key);
    assert.equal(saved.size, validPdfBuffer.length);

    const retrieved = await getPdfBuffer(saved.key, "temp");
    assert.equal(retrieved.toString(), validPdfBuffer.toString());

    const deleted = await deletePdfFile(saved.key, "temp");
    assert.equal(deleted, true);
  });
});
