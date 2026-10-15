import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, jsonResponse, errorResponse } from "@/lib/api-helper";
import { validateUrl } from "@/lib/pdf/overlay";

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
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            template: true,
            generatedCards: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return errorResponse("Customer not found", 404);
    }

    return jsonResponse({ customer });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load customer";
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
    const { name, designation, portfolioUrl, email } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (designation) dataToUpdate.designation = designation.trim();
    if (portfolioUrl) dataToUpdate.portfolioUrl = validateUrl(portfolioUrl);
    if (email !== undefined) dataToUpdate.email = email ? email.trim() : null;

    const updated = await prisma.customer.update({
      where: { id },
      data: dataToUpdate,
    });

    return jsonResponse({ customer: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update customer";
    return errorResponse(msg, 400);
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
    await prisma.customer.delete({
      where: { id },
    });
    return jsonResponse({ message: "Customer deleted successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete customer";
    return errorResponse(msg, 500);
  }
}
