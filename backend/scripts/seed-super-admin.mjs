/**
 * Создать владельца платформы (супер-админ).
 * SUPER_ADMIN_EMAIL=owner@flowers.ru SUPER_ADMIN_PASSWORD=secret node scripts/seed-super-admin.mjs
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD || '';
const name = process.env.SUPER_ADMIN_NAME || 'Владелец платформы';

if (!email || password.length < 6) {
    console.error('Задайте SUPER_ADMIN_EMAIL и SUPER_ADMIN_PASSWORD (мин. 6 символов)');
    process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });
const hash = await bcrypt.hash(password, 10);

if (existing) {
    await prisma.user.update({
        where: { email },
        data: { role: 'SUPER_ADMIN', password: hash, name }
    });
    console.log(`Обновлён супер-админ: ${email}`);
} else {
    await prisma.user.create({
        data: { email, password: hash, name, role: 'SUPER_ADMIN' }
    });
    console.log(`Создан супер-админ: ${email}`);
}

await prisma.$disconnect();
