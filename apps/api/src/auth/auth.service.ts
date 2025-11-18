import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  JwtPayload,
  TokenPair,
  LoginRequest,
  SignupRequest,
  MagicLinkRequest,
  RefreshTokenRequest,
} from '@universal-auth-idp/auth-core';
import { EventEmitterService } from '../lib/events/event-emitter.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRegisteredEvent, UserLoggedInEvent, UserLoggedOutEvent } from '../lib/events/domain-events';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private eventEmitter: EventEmitterService,
    private auditLogs: AuditLogsService,
  ) {}

  async signup(dto: SignupRequest, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    // Find tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug || 'default' },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        passwordHash,
        isActive: true,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Emit event
    await this.eventEmitter.emit(
      new UserRegisteredEvent(tenant.id, {
        userId: user.id,
        email: user.email,
      }),
    );

    // Create audit log
    await this.auditLogs.create({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'user.registered',
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    // Generate tokens
    return this.generateTokens(user.id, tenant.id, user.email, [], []);
  }

  async login(dto: LoginRequest, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    // Find tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug || 'default' },
    });

    if (!tenant) {
      // Record failed attempt
      await this.prisma.loginAttempt.create({
        data: {
          email: dto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          successful: false,
          failReason: 'Tenant not found',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      await this.prisma.loginAttempt.create({
        data: {
          email: dto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          successful: false,
          failReason: 'User not found or inactive',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      await this.prisma.loginAttempt.create({
        data: {
          userId: user.id,
          email: dto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          successful: false,
          failReason: 'Password login not available',
        },
      });
      throw new UnauthorizedException('Please login using social provider');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login count
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: { increment: 1 },
        },
      });

      await this.prisma.loginAttempt.create({
        data: {
          userId: user.id,
          email: dto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          successful: false,
          failReason: 'Invalid password',
        },
      });

      await this.auditLogs.create({
        tenantId: tenant.id,
        actorId: user.id,
        action: 'user.login_failed',
        resource: 'User',
        resourceId: user.id,
        ipAddress,
        userAgent,
        status: 'failure',
        errorMessage: 'Invalid password',
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Update user last login info and reset failed count
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        failedLoginCount: 0,
      },
    });

    // Record successful login attempt
    await this.prisma.loginAttempt.create({
      data: {
        userId: user.id,
        email: dto.email,
        ipAddress: ipAddress || 'unknown',
        userAgent,
        successful: true,
      },
    });

    // Emit event
    await this.eventEmitter.emit(
      new UserLoggedInEvent(tenant.id, {
        userId: user.id,
        email: user.email,
        ipAddress,
      }),
    );

    // Create audit log
    await this.auditLogs.create({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'user.logged_in',
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
      status: 'success',
    });

    // Extract roles and permissions
    const roleKeys = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    return this.generateTokens(user.id, tenant.id, user.email, roleKeys, permissions);
  }

  async requestMagicLink(dto: MagicLinkRequest): Promise<{ message: string }> {
    // Find tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug || 'default' },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          isActive: true,
        },
      });
    }

    // Generate magic link token
    const token = randomBytes(32).toString('hex');
    const expirationMinutes = parseInt(
      this.configService.get<string>('MAGIC_LINK_EXPIRATION').replace('m', ''),
    );
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // Store magic link
    await this.prisma.magicLink.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send magic link via email (using notification adapter)
    const magicLinkUrl = `${this.configService.get('API_URL') || 'http://localhost:3000'}/auth/magic-link/verify?token=${token}`;

    // In production, this would use a real email service via INotificationAdapter
    // For now, log to console for development
    console.log(`Magic link for ${user.email}: ${magicLinkUrl}`);
    console.log(`Token: ${token}`);

    return { message: 'Magic link sent to your email' };
  }

  async verifyMagicLink(token: string): Promise<TokenPair> {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!magicLink || magicLink.used) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    if (new Date() > magicLink.expiresAt) {
      throw new UnauthorizedException('Magic link has expired');
    }

    // Mark as used
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { used: true },
    });

    // Extract roles and permissions
    const roleKeys = magicLink.user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        magicLink.user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    return this.generateTokens(
      magicLink.user.id,
      magicLink.user.tenantId,
      magicLink.user.email,
      roleKeys,
      permissions,
    );
  }

  async handleGoogleAuth(googleUser: any, tenantSlug?: string): Promise<TokenPair> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug || 'default' },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: googleUser.email,
        },
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: googleUser.email,
          isActive: true,
        },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Create or update identity provider account
    await this.prisma.identityProviderAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: googleUser.providerId,
        },
      },
      update: {
        accessToken: googleUser.accessToken,
        refreshToken: googleUser.refreshToken,
      },
      create: {
        userId: user.id,
        provider: 'GOOGLE',
        providerAccountId: googleUser.providerId,
        accessToken: googleUser.accessToken,
        refreshToken: googleUser.refreshToken,
      },
    });

    const roleKeys = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    return this.generateTokens(user.id, tenant.id, user.email, roleKeys, permissions);
  }

  async refreshToken(dto: RefreshTokenRequest): Promise<TokenPair> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: dto.refreshToken },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > session.expiresAt) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Delete old session
    await this.prisma.session.delete({ where: { id: session.id } });

    // Extract roles and permissions
    const roleKeys = session.user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        session.user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    // Generate new tokens
    return this.generateTokens(
      session.userId,
      session.tenantId,
      session.user.email,
      roleKeys,
      permissions,
    );
  }

  async logout(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<{ message: string }> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: true,
      },
    });

    if (session) {
      // Emit event
      await this.eventEmitter.emit(
        new UserLoggedOutEvent(session.tenantId, {
          userId: session.userId,
          email: session.user.email,
        }),
      );

      // Create audit log
      await this.auditLogs.create({
        tenantId: session.tenantId,
        actorId: session.userId,
        action: 'user.logged_out',
        resource: 'User',
        resourceId: session.userId,
        ipAddress,
        userAgent,
        status: 'success',
      });
    }

    await this.prisma.session.deleteMany({
      where: { refreshToken },
    });

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    email: string,
    roleKeys: string[],
    permissions: string[],
  ): Promise<TokenPair> {
    const accessTokenPayload: JwtPayload = {
      sub: userId,
      tenantId,
      email,
      roleKeys,
      permissions,
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub: userId,
      tenantId,
      email,
      roleKeys: [],
      permissions: [],
      type: 'refresh',
    };

    const accessTokenExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION');
    const refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION');

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: accessTokenExpiration,
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: refreshTokenExpiration,
    });

    // Store refresh token in database
    const expirationDays = parseInt(refreshTokenExpiration.replace('d', ''));
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId,
        tenantId,
        refreshToken,
        expiresAt,
      },
    });

    // Parse expiration time
    const expiresIn = this.parseExpirationToSeconds(accessTokenExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private parseExpirationToSeconds(expiration: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // default 15 minutes
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * units[unit];
  }
}
