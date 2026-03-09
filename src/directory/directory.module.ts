import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { DirectoryService } from './directory.service';

@Module({
  imports: [CommonModule],
  providers: [DirectoryService],
  exports: [DirectoryService],
})
export class DirectoryModule {}
