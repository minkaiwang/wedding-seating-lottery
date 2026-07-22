import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const password = configuredPassword || '88888888';
  if (
    process.env.NODE_ENV === 'production' &&
    (!configuredPassword || configuredPassword === '88888888' || configuredPassword.length < 12)
  ) {
    throw new Error(
      'ADMIN_PASSWORD must be set to a non-default value with at least 12 characters in production.',
    );
  }
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existing) {
    return;
  }
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
