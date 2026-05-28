import { io } from 'socket.io-client';
import { API_BASE } from './config/api';

export const socket = io(API_BASE);