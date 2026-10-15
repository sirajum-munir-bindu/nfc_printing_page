import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";

export async function GET() {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const templates = await prisma.cardTemplate.findMany({
      include: {
        elements: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ templates });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load templates";
    return errorResponse(msg, 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const {
      name,
      description,
      frontPdfStorageKey,
      backPdfStorageKey,
      frontPageIndex = 0,
      backPageIndex = 0,
      frontPageWidth,
      frontPageHeight,
      backPageWidth,
      backPageHeight,
      configuration = {},
      elements = [],
    } = body;

    if (!name || !frontPdfStorageKey || !backPdfStorageKey) {
      return errorResponse("Template name and both Front and Back PDF keys are required.", 400);
    }

    const template = await prisma.cardTemplate.create({
      data: {
        name,
        description,
        frontPdfStorageKey,
        backPdfStorageKey,
        frontPageIndex: Number(frontPageIndex),
        backPageIndex: Number(backPageIndex),
        frontPageWidth: Number(frontPageWidth) || 252,
        frontPageHeight: Number(frontPageHeight) || 144,
        backPageWidth: Number(backPageWidth) || 252,
        backPageHeight: Number(backPageHeight) || 144,
        configuration,
        elements: {
          create: elements.map((el: any) => ({
            type: el.type,
            side: el.side || "FRONT",
            x: Number(el.x) || 20,
            y: Number(el.y) || 20,
            width: Number(el.width) || 150,
            height: Number(el.height) || 20,
            rotation: Number(el.rotation) || 0,
            fontFamily: el.fontFamily || "Helvetica",
            fontSize: Number(el.fontSize) || 12,
            color: el.color || "#000000",
            alignment: el.alignment || "left",
            enabled: el.enabled !== false,
            style: el.style || {},
          })),
        },
      },
      include: {
        elements: true,
      },
    });

    return jsonResponse({ template }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create template";
    return errorResponse(msg, 500);
  }
}
