import { Module } from '@nestjs/common';
import { SessionGateway } from './Session.gateway';
import { SessionService } from './SessionService';

@Module({
  //providers: [SessionGateway, SessionService]
})
export class AppModule {}