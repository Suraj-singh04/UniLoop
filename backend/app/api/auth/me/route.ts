import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth; // unauthorized short-circuit

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      verificationStatus: true,
      profilePhotoUrl: true,
      itemsListed: true,
      avgConditionRating: true,
      handoffReliability: true,
      itemsBorrowed: true,
      onTimeReturnRate: true,
      disputeCount: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
