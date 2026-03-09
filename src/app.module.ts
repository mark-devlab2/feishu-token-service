import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AlertModule } from './alert/alert.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ProviderModule } from './provider/provider.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    CommonModule,
    ProviderModule,
    AlertModule,
    AuthModule,
    TokenModule,
    AdminModule,
  ],
})
export class AppModule {}
