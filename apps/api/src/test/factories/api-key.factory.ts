import { ApiKey } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

export interface ApiKeyFactoryOptions {
  tenantId?: string;
  name?: string;
  scopes?: string[];
  expiresAt?: Date;
  isActive?: boolean;
  createdById?: string;
}

export class ApiKeyFactory {
  static async build(options: ApiKeyFactoryOptions = {}): Promise<{ apiKey: Partial<ApiKey>; plainKey: string }> {
    const randomPart = randomBytes(32).toString('hex');
    const plainKey = `idp_${randomPart}`;
    const prefix = `idp_${randomPart.substring(0, 8)}`;
    const keyHash = await bcrypt.hash(plainKey, 10);

    const apiKey: Partial<ApiKey> = {
      tenantId: options.tenantId || 'tenant-id',
      name: options.name || `API Key ${Math.floor(Math.random() * 10000)}`,
      keyHash,
      prefix,
      scopes: options.scopes || ['read'],
      expiresAt: options.expiresAt,
      lastUsedAt: null,
      isActive: options.isActive ?? true,
      createdById: options.createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { apiKey, plainKey };
  }

  static async buildServiceAccount(tenantId: string): Promise<{ apiKey: Partial<ApiKey>; plainKey: string }> {
    return this.build({
      tenantId,
      name: 'Service Account Key',
      scopes: ['read', 'write'],
      expiresAt: null, // No expiration
    });
  }

  static async buildReadOnly(tenantId: string): Promise<{ apiKey: Partial<ApiKey>; plainKey: string }> {
    return this.build({
      tenantId,
      name: 'Read Only Key',
      scopes: ['read'],
    });
  }
}
