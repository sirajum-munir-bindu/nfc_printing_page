import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await context.params;
    const template = await prisma.cardTemplate.findUnique({
      where: { id },
      include: {
        elements: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!template) {
      return errorResponse("Template not found", 404);
    }

    return jsonResponse({ template });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load template";
    return errorResponse(msg, 500);
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const {
      name,
      description,
      frontPageIndex,
      backPageIndex,
      frontPageWidth,
      frontPageHeight,
      backPageWidth,
      backPageHeight,
      configuration,
      elements,
    } = body;

    // Use a transaction to update template metadata and synchronize elements
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update template
      const t = await tx.cardTemplate.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          description: description !== undefined ? description : undefined,
          frontPageIndex: frontPageIndex !== undefined ? Number(frontPageIndex) : undefined,
          backPageIndex: backPageIndex !== undefined ? Number(backPageIndex) : undefined,
          frontPageWidth: frontPageWidth !== undefined ? Number(frontPageWidth) : undefined,
          frontPageHeight: frontPageHeight !== undefined ? Number(frontPageHeight) : undefined,
          backPageWidth: backPageWidth !== undefined ? Number(backPageWidth) : undefined,
          backPageHeight: backPageHeight !== undefined ? Number(backPageHeight) : undefined,
          configuration: configuration !== undefined ? configuration : undefined,
        },
      });

      // 2. If elements are provided, sync them
      if (Array.isArray(elements)) {
        // Delete existing elements and recreate with new positions
        await tx.designElement.deleteMany({
          where: { templateId: id },
        });

        if (elements.length > 0) {
          await tx.designElement.createMany({
            data: elements.map((el: any) => ({
              templateId: id,
              type: el.type,
              side: el.side || "FRONT",
              x: Number(el.x),
              y: Number(el.y),
              width: Number(el.width),
              height: Number(el.height),
              rotation: Number(el.rotation || 0),
              fontFamily: el.fontFamily || "Helvetica",
              fontSize: Number(el.fontSize || 12),
              color: el.color || "#000000",
              alignment: el.alignment || "left",
              enabled: el.enabled !== false,
              style: el.style || {},
            })),
          });
        }
      }

      return tx.cardTemplate.findUnique({
        where: { id },
        include: { elements: true },
      });
    });

    return jsonResponse({ template: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update template";
    return errorResponse(msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await context.params;

    // Check if any orders depend on this template
    const orderCount = await prisma.cardOrder.count({
      where: { templateId: id },
    });

    if (orderCount > 0) {
      return errorResponse(
        `Cannot delete template because ${orderCount} existing card order(s) reference it. You can archive or rename it instead.`,
        400
      );
    }

    await prisma.cardTemplate.delete({
      where: { id },
    });

    return jsonResponse({ message: "Template deleted successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete template";
    return errorResponse(msg, 500);
  }
}
