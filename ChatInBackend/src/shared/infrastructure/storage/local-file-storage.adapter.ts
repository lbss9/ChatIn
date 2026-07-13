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
  };

  async save(buffer: Buffer, _originalName: string, mimetype: string): Promise<string> {
    await fs.mkdir(this.uploadsDir, { recursive: true });

    const ext = this.extensionsByMimeType[mimetype] ?? 'bin';

    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const filePath = path.join(this.uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    return `/uploads/${filename}`;
  }

  async delete(fileUrl: string): Promise<void> {
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
