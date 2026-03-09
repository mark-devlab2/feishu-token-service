import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ProviderModule } from '../provider/provider.module';
import { TokenModule } from '../token/token.module';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';

@Module({
  imports: [CommonModule, ProviderModule, TokenModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
