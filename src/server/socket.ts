import { Server as SocketServer } from 'socket.io';

let ioInstance: SocketServer | null = null;

export const initSocket = (server: any) => {
  ioInstance = new SocketServer(server, {
    cors: { origin: '*' }
  });
  return ioInstance;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
};
