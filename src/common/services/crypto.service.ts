import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.TOKEN_ENCRYPTION_KEY || '';
    const normalized = raw.padEnd(32, '0').slice(0, 32);
    this.key = Buffer.from(normalized, 'utf8');
  }

  encrypt(value: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(value: string): string {
    const buffer = Buffer.from(value, 'base64');
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  mask(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    if (value.length <= 8) {
      return '****';
    }

    return `${value.slice(0, 4)}****${value.slice(-4)}`;
  }
}
