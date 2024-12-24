import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  
  // Enable CORS
  app.enableCors({
      origin: 'http://localhost:9000', // Frontend origin
      methods: ['GET', 'POST'],       // Allowed methods
      credentials: true              // Allow cookies/auth headers
  });

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();