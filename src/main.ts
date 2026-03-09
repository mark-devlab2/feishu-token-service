import 'reflect-metadata';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import basicAuth from 'express-basic-auth';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app: any = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
  app.use(
    '/admin',
    basicAuth({
      challenge: true,
      users: {
        [process.env.ADMIN_USERNAME || 'admin']: process.env.ADMIN_PASSWORD || 'change-me',
      },
    }),
  );

  app.setBaseViewsDir(path.join(process.cwd(), 'views'));
  app.setViewEngine('hbs');

  await app.listen(Number(process.env.PORT || 3080));
}

bootstrap();
