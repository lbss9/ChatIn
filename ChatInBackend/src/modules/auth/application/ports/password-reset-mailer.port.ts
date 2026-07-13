export abstract class PasswordResetMailer {
  abstract send(email: string, token: string): Promise<void>;
}
