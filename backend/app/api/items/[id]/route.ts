import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

const prisma = new PrismaClient();

const updateItemSchema = z.object({
  title: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  photos: z.array(z.string().url()).min(1).optional(),
  pricePerDay: z.number().positive().optional(),
  depositAmount: z.number().nonnegative().optional(),
  pickupLocation: z.string().min(2).optional(),
  status: z.enum(["AVAILABLE", "BOOKED", "UNAVAILABLE"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const item = await prisma.item.findUnique({
    where: { id: params.id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avgConditionRating: true,
          handoffReliability: true,
          itemsListed: true,
        },
      },
      zone: { select: { id: true, name: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (item.ownerId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.item.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (item.ownerId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.item.delete({ where: { id: params.id } });
  await prisma.user.update({
    where: { id: auth.userId },
    data: { itemsListed: { decrement: 1 } },
  });

  return NextResponse.json({ message: "Item deleted" });
}
