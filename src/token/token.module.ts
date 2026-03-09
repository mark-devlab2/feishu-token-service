import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { DirectoryModule } from '../directory/directory.module';
import { ProviderModule } from '../provider/provider.module';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';

@Module({
  imports: [ProviderModule, AlertModule, DirectoryModule],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
