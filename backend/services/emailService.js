import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
    if (transporter !== undefined) return transporter;

    const host = process.env.SMTP_HOST;
    if (!host) {
        transporter = null;
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined
    });

    return transporter;
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM = process.env.SMTP_FROM || 'FlowerShop <noreply@flowershop.local>';

/**
 * Письмо клиенту при смене статуса заказа.
 * Без SMTP_HOST пишет в консоль (режим разработки).
 */
export async function sendOrderStatusEmail({
    to,
    userName,
    orderId,
    statusLabel,
    shopName
}) {
    if (!to) return false;

    const subject = `Заказ №${orderId}: ${statusLabel}`;
    const text = [
        `Здравствуйте${userName ? `, ${userName}` : ''}!`,
        '',
        `Статус вашего заказа №${orderId}${shopName ? ` в «${shopName}»` : ''} изменён: ${statusLabel}.`,
        '',
        `Открыть заказы: ${APP_URL}/orders`,
        '',
        '— FlowerShop'
    ].join('\n');

    const html = `
        <p>Здравствуйте${userName ? `, <strong>${userName}</strong>` : ''}!</p>
        <p>Статус заказа <strong>№${orderId}</strong>${shopName ? ` в «${shopName}»` : ''}:
        <strong>${statusLabel}</strong>.</p>
        <p><a href="${APP_URL}/orders">Открыть «Мои заказы»</a></p>
        <p style="color:#888;font-size:12px;">FlowerShop</p>
    `;

    const transport = getTransporter();
    if (!transport) {
        console.log(`[email] ${to} — ${subject}`);
        return true;
    }

    try {
        await transport.sendMail({ from: FROM, to, subject, text, html });
        return true;
    } catch (e) {
        console.error('[email] send failed:', e.message);
        return false;
    }
}
