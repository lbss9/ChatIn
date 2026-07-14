export abstract class PasswordResetMailer {
  public abstract send(email: string, token: string): Promise<void>;
}
