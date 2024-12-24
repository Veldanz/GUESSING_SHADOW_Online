import { SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { Logger } from "@nestjs/common";
import * as jwt from 'jsonwebtoken';
import { SessionService } from './SessionService';
import { ManagedRoom } from "./ManagedRoom";
import { ManagedClient } from "./ManagedClient";
import { GamePermission } from "./data/gameState";
import { GameStartDto } from "./data/GameStartDto";


@WebSocketGateway({
    cors: {
        origin: 'http://localhost:9000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
})
export class SessionGateway {
  @WebSocketServer()
  server: Server;

  logContext : string = `SessionGateway`;

  


  constructor(private sessionService : SessionService) {
  }

  // Handle new client connection
  async handleConnection(socket: Socket) {
    try {
      const token = Array.isArray(socket.handshake.query.token)
        ? socket.handshake.query.token[0]
        : socket.handshake.query.token;
  
      if (!token) {
        throw new Error('No authentication token provided');
      }
  
      const userInfo = jwt.verify(token, this.sessionService.apiSecret);
  
      if (typeof userInfo === 'string' || !('room' in userInfo)) {
        throw new Error('Invalid token payload: Missing "room" property');
      }
  
      let room = this.sessionService.getRoom(userInfo.room);
      if (!room) {
        room = await this.sessionService.createRoom(userInfo.room);
      }
  
      const client = new ManagedClient(userInfo, socket);
      this.sessionService.clientJoin(client, room);
      client.socket.join(room.sid);
  
      Logger.log(`Client connected: ${socket.id} ${JSON.stringify(userInfo)}`, this.logContext);
      socket.emit('handshakeResponse', { livekitUrl: this.sessionService.livekitUrl });
    } catch (error) {
      if (error instanceof Error) {
        Logger.log(`Token verification failed: ${error.message}`, this.logContext);
      } else {
        Logger.log(`Unexpected error occurred: ${JSON.stringify(error)}`, this.logContext);
      }
      socket.disconnect();
    }
  }
  
  

  // Handle client disconnect
  handleDisconnect(socket: Socket) {
    const managedClient = this.sessionService.getClientFromSocket(socket);
    if (managedClient) this.sessionService.clientLeave(managedClient);
    Logger.log(`Client disconnected: ${socket.id} ${managedClient ? managedClient.identity : ""}`, this.logContext);
  }

  @SubscribeMessage('clientChatMessage')
  handleChatMessage(socket: Socket, payload: any) {
    Logger.log(`chatMessage: ${JSON.stringify(payload)}`);
    const room = this.sessionService.getRoomFromSocket(socket);

    this.server.to(room.sid).emit('chatMessage', payload);
  }

  @SubscribeMessage('clientGameStart')
  handleGameStart(socket: Socket, payload: GameStartDto,) {
    const client = this.sessionService.getClientFromSocket(socket);
    if (!client) {
        Logger.log(`Client not found for socket: ${socket.id}`, this.logContext);
        return;
      }
    const room = this.sessionService.getRoomFromSocket(socket);
    if (!room) {
        Logger.log(`Room not found for socket: ${socket.id}`, this.logContext);
        return;
      }

    

    payload.gameId = "Find gameID and get url here";

    const teacherPermission : GamePermission = {identity: client.identity, permissions: ["teacher"]};


    room.gameInfo = {
      gameUrl: "http://localhost:3000",
      permissionList: [ 
        teacherPermission
      ],
    };

    this.server.to(room.sid).emit('serverGameInfo', room.gameInfo);
    this.server.to(room.sid).emit('serverGameUpdate', {});
  }

  @SubscribeMessage('clientGameStop')
  handleGameStop(socket: Socket, payload: any) {
    const room = this.sessionService.getRoomFromSocket(socket);
    room.gameInfo = null;

    this.server.to(room.sid).emit('serverGameInfo', room.gameInfo);
  }

  @SubscribeMessage('clientGameUpdate')
  handleGameUpdate(socket: Socket, payload: any) {
    const room = this.sessionService.getRoomFromSocket(socket);
    room.gameState = payload;
    console.info(`clientGameUpdate: ${JSON.stringify(room.gameState)}`);

    this.server.to(room.sid).emit('serverGameUpdate', room.gameState);
  }
}
export { SessionService };