import 'reflect-metadata';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import hbs from 'hbs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AdminAuthService } from './admin/admin-auth.service';

async function bootstrap() {
  const app: any = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = (process.env.ADMIN_WEB_ORIGINS || 'http://localhost:5173,https://admin.himark.me')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  });

  app.setBaseViewsDir(path.join(process.cwd(), 'views'));
  app.setViewEngine('hbs');
  hbs.registerHelper('eq', (left: unknown, right: unknown) => left === right);

  await app.get(AdminAuthService).ensureDefaultAdmin();
  await app.listen(Number(process.env.PORT || 3080));
}

bootstrap();
