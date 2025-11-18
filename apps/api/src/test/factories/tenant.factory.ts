import { Tenant, TenantSettings } from '@prisma/client';
import { generateSlug } from '@universal-auth-idp/auth-core';

export interface TenantFactoryOptions {
  name?: string;
  slug?: string;
  settings?: Partial<TenantSettings>;
}

export class TenantFactory {
  static build(options: TenantFactoryOptions = {}): Partial<Tenant> {
    const name = options.name || `Test Tenant ${Math.floor(Math.random() * 10000)}`;
    const slug = options.slug || generateSlug(name);

    return {
      name,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static buildSettings(tenantId: string, options: Partial<TenantSettings> = {}): Partial<TenantSettings> {
    return {
      tenantId,
      requireEmailVerification: options.requireEmailVerification ?? false,
      allowSelfRegistration: options.allowSelfRegistration ?? true,
      allowSocialLogin: options.allowSocialLogin ?? true,
      sessionDuration: options.sessionDuration ?? 604800,
      maxFailedLogins: options.maxFailedLogins ?? 5,
      lockoutDuration: options.lockoutDuration ?? 900,
      rateLimit: options.rateLimit ?? 100,
      logoUrl: options.logoUrl,
      primaryColor: options.primaryColor,
      companyName: options.companyName,
      supportEmail: options.supportEmail,
      webhookSecret: options.webhookSecret,
      metadata: options.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
