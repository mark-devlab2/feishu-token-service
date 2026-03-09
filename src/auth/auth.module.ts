import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { ProviderModule } from '../provider/provider.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [ProviderModule, AlertModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
