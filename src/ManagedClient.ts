import { Socket } from 'socket.io';

export class ManagedClient {
  identity: string;
  socket: Socket;
  userInfo: any;

  constructor(userInfo: any, socket: Socket) {
    this.userInfo = userInfo;
    this.identity = userInfo.preferred_username || userInfo.identity;
    this.socket = socket;
  }
}