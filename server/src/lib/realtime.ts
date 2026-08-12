import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

let io: Server | null = null;

export function initRealtime(httpServer: HttpServer, allowedOrigins: string[]) {
  io = new Server(httpServer, { cors: { origin: allowedOrigins } });

  io.on('connection', (socket) => {
    socket.on('job:subscribe', (jobId: unknown) => {
      if (typeof jobId === 'string') socket.join(`job:${jobId}`);
    });
    socket.on('job:unsubscribe', (jobId: unknown) => {
      if (typeof jobId === 'string') socket.leave(`job:${jobId}`);
    });
  });

  return io;
}

export function emitJobUpdate(jobId: string, payload: unknown) {
  io?.to(`job:${jobId}`).emit('job:update', payload);
}
