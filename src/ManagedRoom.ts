export class ManagedRoom {
    sid: string;  // Room identifier
    gameInfo?: any;  // Optional game information
    gameState?: any;  // Optional game state
  
    constructor(roomId: string) {
      this.sid = roomId;
    }
  }