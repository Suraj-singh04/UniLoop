import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { z } from "zod";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email } = parsed.data;
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;

  if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json(
      { error: `Only @${allowedDomain} emails are allowed` },
      { status: 403 },
    );
  }

  // Create user if doesn't exist yet (unverified)
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, verificationStatus: "PENDING" },
    });
  }

  // Generate + store OTP
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.otpCode.create({
    data: { email, code, expiresAt },
  });

  // Send email
  await resend.emails.send({
    from: "UniLoop <onboarding@resend.dev>", // swap for your verified domain later
    to: email,
    subject: "Your UniLoop verification code",
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
  });

  return NextResponse.json({ message: "OTP sent" });
}
