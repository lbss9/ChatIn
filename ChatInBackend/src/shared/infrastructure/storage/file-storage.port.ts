export abstract class FileStoragePort {
  public abstract save(buffer: Buffer, originalName: string, mimetype: string): Promise<string>;
  public abstract delete(fileUrl: string): Promise<void>;
}
