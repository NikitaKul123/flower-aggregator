import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

import { createApp } from './app.js';
import { allowedOrigins } from './config/cors.js';
import { setIo } from './socket/io.js';
import { registerSocketHandlers } from './socket/handlers.js';

dotenv.config();

const app = createApp();
export const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

setIo(io);
registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`🚀 http://localhost:${PORT}`);
    });
}

export default app;
