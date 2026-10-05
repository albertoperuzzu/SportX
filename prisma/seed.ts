// Crea l'admin iniziale se non esiste ancora nessun admin. Idempotente.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@sportx.it").toLowerCase();
  const existing = await prisma.user.count({ where: { role: "ADMIN" } });
  if (existing > 0) {
    console.log("Admin già presente, seed saltato.");
    return;
  }
  await prisma.user.create({
    data: {
      email,
      firstName: "Admin",
      lastName: "SportX",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("SportX2026!", 10),
      mustChangePassword: true,
    },
  });
  console.log(`Creato admin ${email} (password primo accesso: SportX2026!)`);
}

main().finally(() => prisma.$disconnect());
