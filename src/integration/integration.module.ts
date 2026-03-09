import { Module } from '@nestjs/common';
import { DirectoryModule } from '../directory/directory.module';
import { IntegrationController } from './integration.controller';

@Module({
  imports: [DirectoryModule],
  controllers: [IntegrationController],
})
export class IntegrationModule {}
