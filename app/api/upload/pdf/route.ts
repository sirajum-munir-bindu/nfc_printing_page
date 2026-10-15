import { NextRequest } from "next/server";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { savePdfFile, isValidPdfSignature } from "@/lib/storage";
import { inspectPdfBuffer } from "@/lib/pdf/inspector";

export async function POST(req: NextRequest) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const side = (formData.get("side") as string) || "card";

    if (!file) {
      return errorResponse("No file uploaded", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes
    if (!isValidPdfSignature(buffer)) {
      return errorResponse(
        "Invalid file: The uploaded file is not a valid PDF document (magic byte signature verification failed).",
        400
      );
    }

    // Inspect PDF metadata and compatibility
    const inspection = await inspectPdfBuffer(buffer);

    if (inspection.isEncrypted) {
      return errorResponse("Encrypted or password-protected PDFs are not supported.", 400);
    }

    // Save to secure private storage
    const storageResult = await savePdfFile(buffer, "master", `${side}_master`);

    return jsonResponse({
      key: storageResult.key,
      size: storageResult.size,
      sha256: storageResult.sha256,
      pageCount: inspection.pageCount,
      pages: inspection.pages,
      hasForms: inspection.hasForms,
      warnings: inspection.warnings,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return errorResponse(msg, 500);
  }
}
