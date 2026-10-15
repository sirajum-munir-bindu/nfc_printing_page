import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";

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
