import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Controller, Get } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AlertModule } from './alert/alert.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { DirectoryModule } from './directory/directory.module';
import { GatewayModule } from './gateway/gateway.module';
import { IntegrationModule } from './integration/integration.module';
import { ProviderModule } from './provider/provider.module';
import { TokenModule } from './token/token.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    CommonModule,
    DirectoryModule,
    ProviderModule,
    AlertModule,
    AuthModule,
    TokenModule,
    GatewayModule,
    IntegrationModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
