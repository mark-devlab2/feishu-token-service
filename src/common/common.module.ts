import { Global, Module } from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CryptoService } from './services/crypto.service';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';

@Global()
@Module({
  providers: [PrismaService, CryptoService, RedisService, ApiKeyGuard],
  exports: [PrismaService, CryptoService, RedisService, ApiKeyGuard],
})
export class CommonModule {}
