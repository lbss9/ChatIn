export abstract class FileStoragePort {
  abstract save(buffer: Buffer, originalName: string, mimetype: string): Promise<string>;
  abstract delete(fileUrl: string): Promise<void>;
}
