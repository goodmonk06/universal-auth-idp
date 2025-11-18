import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TenantFactory, UserFactory } from '../test/factories';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let tenantSlug: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create a test tenant
    const tenantData = TenantFactory.build({ name: 'Integration Test Tenant' });
    const tenant = await prisma.tenant.create({ data: tenantData as any });
    tenantId = tenant.id;
    tenantSlug = tenant.slug;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          tenantSlug,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');

      // Verify user was created
      const user = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: 'newuser@example.com',
          },
        },
      });

      expect(user).toBeDefined();
      expect(user?.isActive).toBe(true);

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          action: 'user.registered',
          resourceId: user?.id,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.status).toBe('success');
    });

    it('should fail for duplicate email', async () => {
      // Create user first
      const userData = await UserFactory.build({ tenantId, email: 'duplicate@example.com' });
      await prisma.user.create({ data: userData as any });

      // Try to signup with same email
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          tenantSlug,
        })
        .expect(409);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          tenantSlug,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    let testUser: any;
    const testPassword = 'TestPassword123!';

    beforeAll(async () => {
      const userData = await UserFactory.build({
        tenantId,
        email: 'logintest@example.com',
        password: testPassword,
      });
      testUser = await prisma.user.create({ data: userData as any });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'logintest@example.com',
          password: testPassword,
          tenantSlug,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Verify lastLoginAt was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });

      expect(updatedUser?.lastLoginAt).toBeDefined();
      expect(updatedUser?.failedLoginCount).toBe(0);

      // Verify login attempt was recorded
      const loginAttempt = await prisma.loginAttempt.findFirst({
        where: {
          userId: testUser.id,
          successful: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(loginAttempt).toBeDefined();

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          action: 'user.logged_in',
          resourceId: testUser.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.status).toBe('success');
    });

    it('should fail with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword123!',
          tenantSlug,
        })
        .expect(401);

      // Verify failed login was tracked
      const failedAttempt = await prisma.loginAttempt.findFirst({
        where: {
          userId: testUser.id,
          successful: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(failedAttempt).toBeDefined();
      expect(failedAttempt?.failReason).toContain('password');

      // Verify audit log for failure
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          action: 'user.login_failed',
          resourceId: testUser.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.status).toBe('failure');
    });

    it('should fail for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
          tenantSlug,
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const userData = await UserFactory.build({
        tenantId,
        email: 'refreshtest@example.com',
      });
      await prisma.user.create({ data: userData as any });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'refreshtest@example.com',
          password: 'Password123!',
          tenantSlug,
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken); // Should be a new token
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let logoutRefreshToken: string;

    beforeAll(async () => {
      const userData = await UserFactory.build({
        tenantId,
        email: 'logouttest@example.com',
      });
      await prisma.user.create({ data: userData as any });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'logouttest@example.com',
          password: 'Password123!',
          tenantSlug,
        });

      accessToken = loginResponse.body.accessToken;
      logoutRefreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully and invalidate session', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken: logoutRefreshToken,
        })
        .expect(201);

      // Try to use the refresh token again, should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: logoutRefreshToken,
        })
        .expect(401);
    });
  });
});
