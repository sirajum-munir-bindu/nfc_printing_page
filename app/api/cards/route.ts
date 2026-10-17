import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";

export async function GET(req: NextRequest) {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");

    const where: any = {};
    if (search && search.trim() !== "") {
      const q = search.trim();
      where.OR = [
        { order: { customer: { name: { contains: q, mode: "insensitive" } } } },
        { order: { customer: { email: { contains: q, mode: "insensitive" } } } },
        { order: { customer: { designation: { contains: q, mode: "insensitive" } } } },
        { order: { orderReference: { contains: q, mode: "insensitive" } } },
        { order: { template: { name: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [cards, total] = await Promise.all([
      prisma.generatedCard.findMany({
        where,
        take: limit ? parseInt(limit, 10) : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: {
              customer: true,
              template: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.generatedCard.count({ where }),
    ]);

    return jsonResponse({
      cards,
      recentCards: cards,
      total,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load generated cards";
    return errorResponse(msg, 500);
  }
}
