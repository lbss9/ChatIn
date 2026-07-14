import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccessTokenGuard } from '../auth/infrastructure/http/access-token.guard';
import { FileStoragePort } from '../../shared/infrastructure/storage/file-storage.port';

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

type UploadType = 'image' | 'audio' | 'video' | 'document';
type UploadResponse = { url: string; name: string; mimeType: string; size: number; type: UploadType };

@Controller('uploads')
@UseGuards(AccessTokenGuard)
export class UploadsController {
  public constructor(private readonly fileStorage: FileStoragePort) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES, files: 1 },
    }),
  )
  public async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Apenas imagens são permitidas.');
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('O arquivo excede o limite de 20MB.');
    }

    const url = await this.fileStorage.save(file.buffer, file.originalname, file.mimetype);
    return { url, name: file.originalname, mimeType: file.mimetype, size: file.size, type: 'image' };
  }

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES, files: 1 },
    }),
  )
  public async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const type = this.resolveUploadType(file.mimetype);
    if (!type) {
      throw new BadRequestException('Tipo de arquivo não permitido.');
    }

    const url = await this.fileStorage.save(file.buffer, file.originalname, file.mimetype);
    return { url, name: file.originalname, mimeType: file.mimetype, size: file.size, type };
  }

  private resolveUploadType(mimeType: string): UploadType | null {
    const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase();
    if (ALLOWED_IMAGE_TYPES.has(normalizedMimeType)) return 'image';
    if (ALLOWED_AUDIO_TYPES.has(normalizedMimeType)) return 'audio';
    if (ALLOWED_VIDEO_TYPES.has(normalizedMimeType)) return 'video';
    if (ALLOWED_DOCUMENT_TYPES.has(normalizedMimeType)) return 'document';
    return null;
  }
}
