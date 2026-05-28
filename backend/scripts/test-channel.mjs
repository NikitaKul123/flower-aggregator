import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
try {
    const r = await p.message.findMany({ where: { channel: 'SHOP_COURIER' }, take: 1 });
    console.log('OK', r.length);
} catch (e) {
    console.error('FAIL', e.message);
}
await p.$disconnect();
