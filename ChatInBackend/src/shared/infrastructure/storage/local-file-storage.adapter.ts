import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { FileStoragePort } from './file-storage.port';

@Injectable()
export class LocalFileStorageAdapter implements FileStoragePort {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  async save(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
    await fs.mkdir(this.uploadsDir, { recursive: true });

    const ext = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.') + 1)
      : mimetype.split('/')[1] ?? 'bin';

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
