import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  
  // Configure longer timeout for HTTP requests
  app.use((req, res, next) => {
    res.setTimeout(300000); // 5 minutes
    next();
  });
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
