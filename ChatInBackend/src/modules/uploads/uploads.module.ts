import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { FileStoragePort } from '../../shared/infrastructure/storage/file-storage.port';
import { LocalFileStorageAdapter } from '../../shared/infrastructure/storage/local-file-storage.adapter';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [UploadsController],
  providers: [
    { provide: FileStoragePort, useClass: LocalFileStorageAdapter },
  ],
  exports: [FileStoragePort],
})
export class UploadsModule {}
