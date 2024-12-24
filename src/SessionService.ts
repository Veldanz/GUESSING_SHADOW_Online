import { Injectable } from '@nestjs/common';
import { ManagedRoom } from './ManagedRoom';
import { ManagedClient } from './ManagedClient';
import { Socket } from 'socket.io';

@Injectable()
export class SessionService {
  private rooms: Map<string, ManagedRoom> = new Map();
  private clients: Map<string, ManagedClient> = new Map();

  // Environment variables or configuration
  apiSecret: string = process.env.API_SECRET || 'your-secret-key';
  livekitUrl: string = process.env.LIVEKIT_URL || 'your-livekit-url';

  // Create or get a room
  getRoom(roomId: string): ManagedRoom | undefined {
    return this.rooms.get(roomId);
  }

  async createRoom(roomId: string): Promise<ManagedRoom> {
    const room = new ManagedRoom(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  // Manage client joining and leaving
  clientJoin(client: ManagedClient, room: ManagedRoom) {
    this.clients.set(client.socket.id, client);
  }

  clientLeave(client: ManagedClient) {
    this.clients.delete(client.socket.id);
  }

  // Retrieve client and room information
  getClientFromSocket(socket: Socket): ManagedClient | undefined {
    return this.clients.get(socket.id);
  }

  getRoomFromSocket(socket: Socket): ManagedRoom {
    const client = this.getClientFromSocket(socket);
    if (!client) throw new Error('Client not found');
    
    const room = this.getRoom(client.userInfo.room);
    if (!room) throw new Error('Room not found');
    
    return room;
  }
}