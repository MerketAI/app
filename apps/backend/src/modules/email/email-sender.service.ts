import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { CredentialsService } from '../credentials/credentials.service';

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private credentialsService: CredentialsService) {}

  private async getTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) return this.transporter;

    const host = await this.credentialsService.get('SMTP_HOST');
    const port = await this.credentialsService.get('SMTP_PORT');
    const user = await this.credentialsService.get('SMTP_USER');
    const pass = await this.credentialsService.get('SMTP_PASS');

    if (!host || !user) {
      this.logger.warn('SMTP not configured: missing SMTP_HOST or SMTP_USER');
      return null;
    }

    const portNum = parseInt(port || '587', 10);

    this.transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: portNum === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    fromName?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP not configured. Set SMTP credentials in Admin > Credentials.' };
    }

    const fromEmail =
      options.from || (await this.credentialsService.get('SMTP_FROM_EMAIL'));
    const fromName =
      options.fromName ||
      (await this.credentialsService.get('SMTP_FROM_NAME')) ||
      'Jasper';

    if (!fromEmail) {
      return { success: false, error: 'No sender email configured. Set SMTP_FROM_EMAIL in credentials.' };
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Failed to send email to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }

  async sendBatch(
    emails: { to: string; subject: string; html: string }[],
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${email.to}: ${result.error}`);
      }
      // Small delay between sends to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }

    this.logger.log(`Batch send complete: ${sent} sent, ${failed} failed out of ${emails.length}`);
    return { sent, failed, errors };
  }

  async isConfigured(): Promise<boolean> {
    const host = await this.credentialsService.get('SMTP_HOST');
    return !!host;
  }

  /**
   * Reset the cached transporter (useful if SMTP credentials change).
   */
  resetTransporter(): void {
    this.transporter = null;
  }
}
