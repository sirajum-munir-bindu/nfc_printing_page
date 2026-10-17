import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { deletePdfFile } from "@/lib/storage";

export async function GET() {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const orders = await prisma.cardOrder.findMany({
      include: {
        customer: true,
        template: {
          select: { id: true, name: true },
        },
        generatedCards: {
          select: {
            id: true,
            frontPdfStorageKey: true,
            backPdfStorageKey: true,
            combinedPdfStorageKey: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ orders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load orders";
    return errorResponse(msg, 500);
  }
}

export async function PUT(req: NextRequest) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const { orderId, status, notes } = body;

    if (!orderId) {
      return errorResponse("Order ID is required", 400);
    }

    const updated = await prisma.cardOrder.update({
      where: { id: orderId },
      data: {
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return jsonResponse({ order: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update order";
    return errorResponse(msg, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    let orderId = searchParams.get("id") || searchParams.get("orderId");

    if (!orderId) {
      try {
        const body = await req.json();
        orderId = body?.orderId || body?.id;
      } catch {
        // body is optional if passed in query param
      }
    }

    if (!orderId) {
      return errorResponse("Order ID is required", 400);
    }

    const order = await prisma.cardOrder.findUnique({
      where: { id: orderId },
      include: { generatedCards: true },
    });

    if (!order) {
      return errorResponse("Order not found", 404);
    }

    // Clean up stored PDF files for all generated cards in this order
    if (order.generatedCards && order.generatedCards.length > 0) {
      for (const card of order.generatedCards) {
        if (card.frontPdfStorageKey) {
          await deletePdfFile(card.frontPdfStorageKey, "generated").catch(() => {});
        }
        if (card.backPdfStorageKey) {
          await deletePdfFile(card.backPdfStorageKey, "generated").catch(() => {});
        }
        if (card.combinedPdfStorageKey) {
          await deletePdfFile(card.combinedPdfStorageKey, "generated").catch(() => {});
        }
      }
    }

    // Delete the order (associated GeneratedCard records are cascade deleted by Prisma)
    await prisma.cardOrder.delete({
      where: { id: orderId },
    });

    return jsonResponse({ success: true, message: "Order deleted successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete order";
    return errorResponse(msg, 500);
  }
}
