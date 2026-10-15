import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";

export async function GET() {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const [
      totalTemplates,
      totalCustomers,
      totalGeneratedCards,
      pendingOrdersCount,
      recentCards,
      recentOrders,
    ] = await Promise.all([
      prisma.cardTemplate.count(),
      prisma.customer.count(),
      prisma.generatedCard.count(),
      prisma.cardOrder.count({ where: { status: "PENDING" } }),
      prisma.generatedCard.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: {
              customer: true,
              template: { select: { name: true } },
            },
          },
        },
      }),
      prisma.cardOrder.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          template: { select: { name: true } },
          generatedCards: { select: { id: true } },
        },
      }),
    ]);

    return jsonResponse({
      stats: {
        totalTemplates,
        totalCustomers,
        totalGeneratedCards,
        pendingOrders: pendingOrdersCount,
      },
      recentCards,
      recentOrders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load dashboard metrics";
    return errorResponse(msg, 500);
  }
}
