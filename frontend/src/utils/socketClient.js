import { io } from 'socket.io-client';
import { API_BASE as API } from '../config/api';

/** Socket.IO с JWT */
export function createAuthenticatedSocket(token) {
    return io(API, {
        auth: { token: token || localStorage.getItem('token') }
    });
}
