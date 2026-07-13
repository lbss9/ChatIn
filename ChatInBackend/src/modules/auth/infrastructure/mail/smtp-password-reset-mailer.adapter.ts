import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PasswordResetMailer } from '../../application/ports/password-reset-mailer.port';

@Injectable()
export class SmtpPasswordResetMailer implements PasswordResetMailer {
  private readonly logger = new Logger(SmtpPasswordResetMailer.name);
  constructor(private readonly config: ConfigService) {}

  async send(email: string, token: string) {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000').replace(/\/$/, '');
    const url = `${appUrl}/reset-password/?token=${encodeURIComponent(token)}`;
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn(`SMTP not configured. Password reset URL for ${email}: ${url}`);
      return;
    }
    const port = this.config.get<number>('SMTP_PORT', 587);
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: this.config.getOrThrow<string>('SMTP_USER'), pass: this.config.getOrThrow<string>('SMTP_PASS') },
    });
    await transport.sendMail({
      from: this.config.getOrThrow<string>('MAIL_FROM'),
      to: email,
      subject: 'Redefina sua senha do ChatIn',
      text: `Use este link para redefinir sua senha: ${url}`,
    });
  }
}
