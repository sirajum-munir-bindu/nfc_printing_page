import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { validateUrl } from "@/lib/pdf/overlay";

export async function GET() {
  const user = await requireApiAuth();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ customers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load customers";
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
    const { name, designation, portfolioUrl, email } = body;

    if (!name || !portfolioUrl) {
      return errorResponse("Customer Name and Portfolio URL are required.", 400);
    }

    const validUrl = validateUrl(portfolioUrl);

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        designation: designation ? designation.trim() : null,
        portfolioUrl: validUrl,
        email: email ? email.trim() : null,
      },
    });

    return jsonResponse({ customer }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create customer";
    return errorResponse(msg, 400);
  }
}
