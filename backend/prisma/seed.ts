import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const zones = [
    "25 Block",
    "26 Block",
    "27 Block",
    "28 Block",
    "BH1",
    "BH2",
    "BH3",
    "BH4",
    "Law Block",
    "Management Block",
  ];
  for (const name of zones) {
    await prisma.zone.upsert({ where: { name }, update: {}, create: { name } });
  }
}

main().finally(() => prisma.$disconnect());
