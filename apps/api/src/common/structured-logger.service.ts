import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger('StructuredLog');

  info(event: string, fields: Record<string, unknown> = {}): void {
    this.logger.log(this.serialize('info', event, fields));
  }

  warn(event: string, fields: Record<string, unknown> = {}): void {
    this.logger.warn(this.serialize('warn', event, fields));
  }

  error(event: string, fields: Record<string, unknown> = {}): void {
    this.logger.error(this.serialize('error', event, fields));
  }

  private serialize(level: 'info' | 'warn' | 'error', event: string, fields: Record<string, unknown>): string {
    return JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...fields
    });
  }
}
