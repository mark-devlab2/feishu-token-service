import { Module } from '@nestjs/common';
import { DirectoryModule } from '../directory/directory.module';
import { TokenModule } from '../token/token.module';
import { AdminController } from './admin.controller';
import { AdminApiController } from './admin-api.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminSessionGuard } from './admin-session.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [DirectoryModule, TokenModule],
  controllers: [AdminController, AdminApiController],
  providers: [AdminAuthService, AdminService, AdminSessionGuard],
  exports: [AdminAuthService, AdminService, AdminSessionGuard],
})
export class AdminModule {}
