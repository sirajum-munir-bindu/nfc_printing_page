import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, errorResponse } from "@/lib/api-helper";
import { getPdfBuffer, sanitizeStorageKey } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { key } = await context.params;
    const sanitizedKey = sanitizeStorageKey(key);

    const download = req.nextUrl.searchParams.get("download") === "1";
    const filename = req.nextUrl.searchParams.get("filename") || sanitizedKey;

    // Buffer fetch (will check master or generated storage)
    const buffer = await getPdfBuffer(sanitizedKey, "master");

    const disposition = download
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "File not found";
    return errorResponse(msg, 404);
  }
}
