import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { deletePdfFile } from "@/lib/storage";

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

    if (!id) {
      return errorResponse("Order ID is required", 400);
    }

    const order = await prisma.cardOrder.findUnique({
      where: { id },
      include: { generatedCards: true },
    });

    if (!order) {
      return errorResponse("Order not found", 404);
    }

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

    await prisma.cardOrder.delete({
      where: { id },
    });

    return jsonResponse({ success: true, message: "Order deleted successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete order";
    return errorResponse(msg, 500);
  }
}
