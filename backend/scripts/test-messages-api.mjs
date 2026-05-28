import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createApp } from '../app.js';
import { setIo } from '../socket/io.js';
import request from 'supertest';

dotenv.config();

setIo({ to: () => ({ emit: () => {} }) });
const app = createApp();
const secret = process.env.JWT_SECRET;

const orderId = Number(process.argv[2] || 32);
const role = process.argv[3] || 'courier';

async function main() {
    let token;
    if (role === 'courier') {
        token = jwt.sign({ userId: 3, role: 'COURIER', shopId: 1 }, secret);
    } else {
        token = jwt.sign({ userId: 1, role: 'SHOP_ADMIN', shopId: 1 }, secret);
    }

    for (const ch of ['shop-courier', 'SHOP_COURIER', 'courier']) {
        const res = await request(app)
            .get(`/api/messages/order/${orderId}?channel=${ch}`)
            .set('Authorization', `Bearer ${token}`)
            .set('Origin', 'http://127.0.0.1:3000');
        console.log(`GET channel=${ch} -> ${res.status}`, res.body?.error || `msgs:${(res.body?.messages || res.body)?.length ?? 'ok'}`);
    }
}

main().catch(e => {
    console.error('FAIL', e);
    process.exit(1);
});
