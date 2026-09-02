import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

const prisma = new PrismaClient();

const createItemSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(5),
  photos: z.array(z.string().url()).min(1),
  pricePerDay: z.number().positive(),
  depositAmount: z.number().nonnegative(),
  zoneId: z.string(),
  pickupLocation: z.string().min(2),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const item = await prisma.item.create({
    data: {
      ...parsed.data,
      ownerId: auth.userId,
      status: "AVAILABLE",
    },
  });

  // Keep the owner's itemsListed count in sync
  await prisma.user.update({
    where: { id: auth.userId },
    data: { itemsListed: { increment: 1 } },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") ?? undefined;
  const zoneId = searchParams.get("zoneId") ?? undefined;
  const maxPrice = searchParams.get("maxPrice");
  const status = searchParams.get("status") ?? "AVAILABLE";

  const items = await prisma.item.findMany({
    where: {
      ...(category && { category }),
      ...(zoneId && { zoneId }),
      ...(maxPrice && { pricePerDay: { lte: parseFloat(maxPrice) } }),
      status: status as any,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avgConditionRating: true,
          handoffReliability: true,
        },
      },
      zone: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}
