import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mmToPoints,
  pointsToMm,
  inchesToPoints,
  pointsToInches,
  editorToPdfCoords,
  pdfToEditorCoords,
  isWithinPageBounds,
  Rect,
} from "../lib/pdf/coordinate";

describe("PDF Coordinate Math", () => {
  it("converts between inches, mm and points accurately", () => {
    // 1 inch = 72 pt
    assert.equal(inchesToPoints(1), 72);
    assert.equal(pointsToInches(72), 1);

    // Standard card: 3.5" x 2.0" = 252 x 144 pt
    assert.equal(inchesToPoints(3.5), 252);
    assert.equal(inchesToPoints(2.0), 144);

    // mm conversion
    const mmVal = 50.8; // 2 inches
    assert.ok(Math.abs(mmToPoints(mmVal) - 144) < 0.1);
    assert.ok(Math.abs(pointsToMm(144) - 50.8) < 0.1);
  });

  it("converts top-left editor coords to bottom-left PDF coordinates", () => {
    const pageHeight = 144; // 2 inches
    const editorRect: Rect = { x: 20, y: 30, width: 100, height: 25 };

    const pdfCoords = editorToPdfCoords(editorRect, pageHeight);
    assert.equal(pdfCoords.x, 20);
    // pdfY should be pageHeight - (y + height) = 144 - (30 + 25) = 89
    assert.equal(pdfCoords.y, 89);
    assert.equal(pdfCoords.width, 100);
    assert.equal(pdfCoords.height, 25);

    // Round-trip back to editor coords
    const roundTrip = pdfToEditorCoords(pdfCoords, pageHeight);
    assert.equal(roundTrip.x, editorRect.x);
    assert.equal(roundTrip.y, editorRect.y);
    assert.equal(roundTrip.width, editorRect.width);
    assert.equal(roundTrip.height, editorRect.height);
  });

  it("checks whether an element is inside page bounds", () => {
    const pageWidth = 252;
    const pageHeight = 144;

    const validRect: Rect = { x: 10, y: 10, width: 100, height: 30 };
    const check1 = isWithinPageBounds(validRect, pageWidth, pageHeight);
    assert.equal(check1.valid, true);
    assert.equal(check1.overflow.right, 0);

    const outOfBoundsRect: Rect = { x: 200, y: 10, width: 100, height: 30 }; // x + width = 300 > 252
    const check2 = isWithinPageBounds(outOfBoundsRect, pageWidth, pageHeight);
    assert.equal(check2.valid, false);
    assert.equal(check2.overflow.right, 48);
  });
});
