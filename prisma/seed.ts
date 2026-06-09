import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existing) {
    return;
  }
  const password = process.env.ADMIN_PASSWORD || '88888888';
  if (password === '88888888' || password.length < 10) {
    console.warn(
      '[seed] Weak or default ADMIN_PASSWORD; set a strong password in .env before exposing this service.',
    );
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  await prisma.user.create({
    data: { username: 'admin', passwordHash },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
