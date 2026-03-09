import { Module } from '@nestjs/common';
import { FeishuProvider } from './feishu.provider';

@Module({
  providers: [FeishuProvider],
  exports: [FeishuProvider],
})
export class ProviderModule {}
