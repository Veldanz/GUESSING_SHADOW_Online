import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { GameStateContent } from "~/data/gameState";

@WebSocketGateway({ cors: true })
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private gameState: GameStateContent = {} as GameStateContent;

    handleConnection(socket: Socket) {
        console.log(`Client connected: ${socket.id}`);
    }

    handleDisconnect(socket: Socket) {
        console.log(`Client disconnected: ${socket.id}`);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(socket: Socket, room: string = 'defaultRoom'): void {
        socket.join(room);
        console.log(`Client ${socket.id} joined room ${room}`);
    }

    @SubscribeMessage('clientGameUpdate')
    handleGameUpdate(socket: Socket, gameState: GameStateContent): void {
        // Simply broadcast the received game state to all players in the room
        this.gameState = { ...gameState };
        this.server.to('defaultRoom').emit('serverGameUpdate', this.gameState);
        console.log(`Game state updated by ${socket.id}`);
    }
}