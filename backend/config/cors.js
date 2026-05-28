/** Origins: dev + CORS_ORIGIN (один URL или несколько через запятую) */
const extraOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...extraOrigins
];

export function corsOrigin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
    }
    callback(new Error(`CORS: origin not allowed — ${origin}`));
}

export const corsOptions = {
    origin: corsOrigin,
    credentials: true
};
