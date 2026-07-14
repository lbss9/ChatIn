export abstract class PasswordHasher {
  public abstract hash(value: string): Promise<string>;
  public abstract compare(value: string, hash: string): Promise<boolean>;
}
