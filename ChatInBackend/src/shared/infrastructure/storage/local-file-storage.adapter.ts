import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { FileStoragePort } from './file-storage.port';

@Injectable()
export class LocalFileStorageAdapter implements FileStoragePort {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');
  private readonly extensionsByMimeType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };

  public async save(buffer: Buffer, _originalName: string, mimetype: string): Promise<string> {
    await fs.mkdir(this.uploadsDir, { recursive: true });

    const ext = this.extensionsByMimeType[mimetype.split(';')[0].trim().toLowerCase()] ?? 'bin';

    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const filePath = path.join(this.uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    return `/uploads/${filename}`;
  }

  public async delete(fileUrl: string): Promise<void> {
    try {
      const filename = fileUrl.replace(/^\/uploads\//, '');
      const filePath = path.join(this.uploadsDir, filename);
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
