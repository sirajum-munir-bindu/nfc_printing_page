/**
 * PDF Coordinate System Utilities
 *
 * Coordinates in PDF.js and pdf-lib:
 * - 1 PDF point = 1/72 inch = 0.352778 mm.
 * - Standard business card:
 *     US Standard: 3.5" x 2.0" = 252 pt x 144 pt (88.9 mm x 50.8 mm)
 *     With 0.125" bleed: 3.75" x 2.25" = 270 pt x 162 pt
 *     EU / ISO CR80 (Credit card): 85.6 mm x 53.98 mm = 242.64 pt x 153.02 pt
 *
 * Screen Coordinate Space:
 * - Origin (0,0) at Top-Left
 * - X goes right (+), Y goes down (+)
 *
 * PDF Coordinate Space (pdf-lib):
 * - Origin (0,0) at Bottom-Left of MediaBox / CropBox
 * - X goes right (+), Y goes UP (+)
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageDimensions {
  width: number; // in PDF points
  height: number; // in PDF points
  rotation?: number; // 0, 90, 180, 270
}

export const POINTS_PER_INCH = 72;
export const MM_PER_INCH = 25.4;
export const POINTS_PER_MM = POINTS_PER_INCH / MM_PER_INCH; // ~2.83465 pt/mm

/**
 * Converts millimeters to PDF points
 */
export function mmToPoints(mm: number): number {
  return Number((mm * POINTS_PER_MM).toFixed(3));
}

/**
 * Converts PDF points to millimeters
 */
export function pointsToMm(pt: number): number {
  return Number((pt / POINTS_PER_MM).toFixed(2));
}

/**
 * Converts inches to PDF points
 */
export function inchesToPoints(inches: number): number {
  return Number((inches * POINTS_PER_INCH).toFixed(3));
}

/**
 * Converts PDF points to inches
 */
export function pointsToInches(pt: number): number {
  return Number((pt / POINTS_PER_INCH).toFixed(3));
}

/**
 * Converts top-left screen/editor coordinates (in points) to pdf-lib bottom-left coordinates.
 *
 * @param rect Top-left referenced rectangle in points: { x, y, width, height }
 *             where (0,0) is top-left of the page.
 * @param pageHeight Height of the PDF page in points.
 * @returns Rectangle with (x, y) referencing the bottom-left corner for pdf-lib.
 */
export function editorToPdfCoords(rect: Rect, pageHeight: number): Rect {
  // Screen Y is measured from the top down.
  // The bottom of the bounding box is at screenY + height.
  // In PDF coordinates, the distance from the bottom is: pageHeight - (screenY + height).
  const pdfX = rect.x;
  const pdfY = pageHeight - (rect.y + rect.height);

  return {
    x: Number(pdfX.toFixed(3)),
    y: Number(pdfY.toFixed(3)),
    width: Number(rect.width.toFixed(3)),
    height: Number(rect.height.toFixed(3)),
  };
}

/**
 * Converts pdf-lib bottom-left coordinates back to editor top-left coordinates (in points).
 *
 * @param rect Bottom-left referenced rectangle in points: { x, y, width, height }
 * @param pageHeight Height of the PDF page in points.
 * @returns Rectangle with (x, y) referencing the top-left corner for visual editor.
 */
export function pdfToEditorCoords(rect: Rect, pageHeight: number): Rect {
  const screenX = rect.x;
  const screenY = pageHeight - (rect.y + rect.height);

  return {
    x: Number(screenX.toFixed(3)),
    y: Number(screenY.toFixed(3)),
    width: Number(rect.width.toFixed(3)),
    height: Number(rect.height.toFixed(3)),
  };
}

/**
 * Calculates zoom scale factor between canvas pixel width/height and physical PDF points.
 */
export function getCanvasScale(canvasWidth: number, pageWidthPoints: number): number {
  if (pageWidthPoints <= 0) return 1;
  return canvasWidth / pageWidthPoints;
}

/**
 * Converts screen mouse/pointer event coordinates relative to the canvas into PDF points.
 */
export function screenPxToPdfPoints(
  pixelX: number,
  pixelY: number,
  scale: number
): Point {
  if (scale <= 0) scale = 1;
  return {
    x: Number((pixelX / scale).toFixed(3)),
    y: Number((pixelY / scale).toFixed(3)),
  };
}

/**
 * Converts PDF points into canvas display pixels.
 */
export function pdfPointsToScreenPx(
  ptX: number,
  ptY: number,
  scale: number
): Point {
  return {
    x: Math.round(ptX * scale),
    y: Math.round(ptY * scale),
  };
}

/**
 * Checks if a bounding box is fully contained within the printable page area.
 */
export function isWithinPageBounds(
  rect: Rect,
  pageWidth: number,
  pageHeight: number,
  marginPt = 0
): { valid: boolean; overflow: { left: number; top: number; right: number; bottom: number } } {
  const left = rect.x - marginPt;
  const top = rect.y - marginPt;
  const right = pageWidth - marginPt - (rect.x + rect.width);
  const bottom = pageHeight - marginPt - (rect.y + rect.height);

  const valid = left >= 0 && top >= 0 && right >= 0 && bottom >= 0;

  return {
    valid,
    overflow: {
      left: Math.max(0, -left),
      top: Math.max(0, -top),
      right: Math.max(0, -right),
      bottom: Math.max(0, -bottom),
    },
  };
}
