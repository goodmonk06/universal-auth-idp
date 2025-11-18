import { User, UserProfile } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface UserFactoryOptions {
  tenantId?: string;
  email?: string;
  password?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  profile?: Partial<UserProfile>;
}

export class UserFactory {
  static async build(options: UserFactoryOptions = {}): Promise<Partial<User>> {
    const email = options.email || `test${Math.floor(Math.random() * 100000)}@example.com`;
    const password = options.password || 'Password123!';
    const passwordHash = await bcrypt.hash(password, 10);

    return {
      tenantId: options.tenantId || 'tenant-id',
      email,
      passwordHash,
      emailVerified: options.emailVerified ?? false,
      isActive: options.isActive ?? true,
      lastLoginAt: null,
      lastLoginIp: null,
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static buildProfile(userId: string, options: Partial<UserProfile> = {}): Partial<UserProfile> {
    return {
      userId,
      firstName: options.firstName || 'John',
      lastName: options.lastName || 'Doe',
      displayName: options.displayName || 'John Doe',
      avatarUrl: options.avatarUrl,
      bio: options.bio,
      phoneNumber: options.phoneNumber,
      timezone: options.timezone || 'UTC',
      locale: options.locale || 'en-US',
      metadata: options.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static async buildAdmin(options: UserFactoryOptions = {}): Promise<Partial<User>> {
    return this.build({
      ...options,
      email: options.email || `admin${Math.floor(Math.random() * 10000)}@example.com`,
      emailVerified: true,
      isActive: true,
    });
  }

  static async buildWithProfile(options: UserFactoryOptions = {}): Promise<{ user: Partial<User>; profile: Partial<UserProfile> }> {
    const user = await this.build(options);
    const profile = this.buildProfile('user-id', options.profile);
    return { user, profile };
  }
}
