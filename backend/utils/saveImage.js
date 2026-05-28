import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

export function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}

export function saveBase64Image(imageBase64, prefix = 'chat') {
    if (!imageBase64?.startsWith('data:image')) return null;
    ensureUploadDir();
    const match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return null;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
        throw new Error('Файл слишком большой (макс. 5 МБ)');
    }
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    return `/uploads/${filename}`;
}
