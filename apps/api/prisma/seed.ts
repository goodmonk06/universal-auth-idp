import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default',
    },
  });

  console.log('Created tenant:', tenant.name);

  // Create default permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'users:read' } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: 'users:read',
        description: 'Read users',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'users:write' } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: 'users:write',
        description: 'Create and update users',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'users:delete' } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: 'users:delete',
        description: 'Delete users',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'roles:read' } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: 'roles:read',
        description: 'Read roles',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'roles:write' } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: 'roles:write',
        description: 'Create and update roles',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'applications:read' } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: 'applications:read',
        description: 'Read applications',
      },
    }),
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'applications:write' } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: 'applications:write',
        description: 'Create and update applications',
      },
    }),
  ]);

  console.log('Created permissions:', permissions.length);

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Administrator with full access',
    },
  });

  // Assign all permissions to admin role
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('Created admin role with all permissions');

  // Create platform admin user
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      isActive: true,
    },
  });

  // Assign admin role to user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('Created admin user:', adminEmail);

  // Create a sample application
  const clientId = randomBytes(16).toString('hex');
  const clientSecret = randomBytes(32).toString('hex');
  const clientSecretHash = await bcrypt.hash(clientSecret, 10);

  const app = await prisma.application.upsert({
    where: { clientId },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Sample Application',
      clientId,
      clientSecret: clientSecretHash,
      redirectUris: ['http://localhost:4000/callback'],
    },
  });

  console.log('Created sample application:', app.name);
  console.log('Client ID:', clientId);
  console.log('Client Secret:', clientSecret);
  console.log('\nSEED COMPLETE!');
  console.log('Admin credentials:');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
