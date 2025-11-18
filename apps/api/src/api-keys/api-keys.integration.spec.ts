import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TenantFactory, UserFactory } from '../test/factories';
import { JwtService } from '@nestjs/jwt';

describe('API Keys Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let tenantId: string;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test tenant and user
    const tenantData = TenantFactory.build({ name: 'API Keys Test Tenant' });
    const tenant = await prisma.tenant.create({ data: tenantData as any });
    tenantId = tenant.id;

    const userData = await UserFactory.build({ tenantId, email: 'apikeystest@example.com' });
    const user = await prisma.user.create({ data: userData as any });
    userId = user.id;

    // Generate access token
    accessToken = jwtService.sign({
      sub: userId,
      tenantId,
      email: user.email,
      roleKeys: [],
      permissions: [],
      type: 'access',
    });
  });

  afterAll(async () => {
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  describe('POST /tenants/:tenantId/api-keys', () => {
    it('should create a new API key', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test API Key',
          scopes: ['read', 'write'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('apiKey');
      expect(response.body).toHaveProperty('plainKey');
      expect(response.body.apiKey.name).toBe('Test API Key');
      expect(response.body.apiKey.scopes).toEqual(['read', 'write']);
      expect(response.body.plainKey).toMatch(/^idp_[a-f0-9]{64}$/);

      // Verify API key was created in database
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: response.body.apiKey.id },
      });

      expect(apiKey).toBeDefined();
      expect(apiKey?.isActive).toBe(true);
    });

    it('should create API key with expiration', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Expiring Key',
          scopes: ['read'],
          expiresAt: expiresAt.toISOString(),
        })
        .expect(201);

      expect(response.body.apiKey.expiresAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scopes: ['read'],
        })
        .expect(400);
    });
  });

  describe('GET /tenants/:tenantId/api-keys', () => {
    beforeAll(async () => {
      // Create some test API keys
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/tenants/${tenantId}/api-keys`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `List Test Key ${i}`,
            scopes: ['read'],
          });
      }
    });

    it('should list all API keys for a tenant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Keys should not include the hash
      response.body.forEach((key: any) => {
        expect(key).not.toHaveProperty('keyHash');
        expect(key).toHaveProperty('prefix');
      });
    });
  });

  describe('POST /tenants/:tenantId/api-keys/verify', () => {
    let plainKey: string;
    let apiKeyId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Verify Test Key',
          scopes: ['read', 'write'],
        });

      plainKey = response.body.plainKey;
      apiKeyId = response.body.apiKey.id;
    });

    it('should verify a valid API key', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys/verify`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          apiKey: plainKey,
        })
        .expect(201);

      expect(response.body.valid).toBe(true);
      expect(response.body.scopes).toEqual(['read', 'write']);

      // Verify lastUsedAt was updated
      const updatedKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      expect(updatedKey?.lastUsedAt).toBeDefined();
    });

    it('should reject invalid API key', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys/verify`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          apiKey: 'idp_invalidkey123',
        })
        .expect(201);

      expect(response.body.valid).toBe(false);
    });

    it('should reject inactive API key', async () => {
      // Deactivate the key
      await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: { isActive: false },
      });

      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys/verify`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          apiKey: plainKey,
        })
        .expect(201);

      expect(response.body.valid).toBe(false);
    });
  });

  describe('PATCH /tenants/:tenantId/api-keys/:id', () => {
    let apiKeyId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Update Test Key',
          scopes: ['read'],
        });

      apiKeyId = response.body.apiKey.id;
    });

    it('should update API key name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tenants/${tenantId}/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Key Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Key Name');
    });

    it('should update API key scopes', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tenants/${tenantId}/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scopes: ['read', 'write', 'delete'],
        })
        .expect(200);

      expect(response.body.scopes).toEqual(['read', 'write', 'delete']);
    });

    it('should deactivate API key', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tenants/${tenantId}/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('DELETE /tenants/:tenantId/api-keys/:id', () => {
    let apiKeyId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenants/${tenantId}/api-keys`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Delete Test Key',
          scopes: ['read'],
        });

      apiKeyId = response.body.apiKey.id;
    });

    it('should delete an API key', async () => {
      await request(app.getHttpServer())
        .delete(`/tenants/${tenantId}/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify key was deleted
      const deletedKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      expect(deletedKey).toBeNull();
    });

    it('should return 404 for non-existent key', async () => {
      await request(app.getHttpServer())
        .delete(`/tenants/${tenantId}/api-keys/non-existent-id`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
