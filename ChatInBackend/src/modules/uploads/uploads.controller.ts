import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccessTokenGuard } from '../auth/infrastructure/http/access-token.guard';
import { FileStoragePort } from '../../shared/infrastructure/storage/file-storage.port';

@Controller('uploads')
@UseGuards(AccessTokenGuard)
export class UploadsController {
  constructor(private readonly fileStorage: FileStoragePort) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Apenas imagens são permitidas.');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('O arquivo excede o limite de 5MB.');
    }

    const url = await this.fileStorage.save(file.buffer, file.originalname, file.mimetype);
    return { url };
  }
}
