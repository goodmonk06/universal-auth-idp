import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create tenants
  console.log('📦 Creating tenants...');
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'default',
    },
  });

  const demoCorp = await prisma.tenant.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Corporation',
      slug: 'demo-corp',
    },
  });

  console.log(`✓ Created tenants: ${defaultTenant.name}, ${demoCorp.name}\n`);

  // Create comprehensive permissions for default tenant
  console.log('🔐 Creating permissions...');
  const permissionData = [
    { key: 'users:read', description: 'View users' },
    { key: 'users:write', description: 'Create and update users' },
    { key: 'users:delete', description: 'Delete users' },
    { key: 'roles:read', description: 'View roles' },
    { key: 'roles:write', description: 'Create and update roles' },
    { key: 'roles:delete', description: 'Delete roles' },
    { key: 'permissions:read', description: 'View permissions' },
    { key: 'permissions:write', description: 'Manage permissions' },
    { key: 'applications:read', description: 'View applications' },
    { key: 'applications:write', description: 'Manage applications' },
    { key: 'tenants:read', description: 'View tenants' },
    { key: 'tenants:write', description: 'Manage tenants' },
    { key: 'content:read', description: 'View content' },
    { key: 'content:write', description: 'Create and edit content' },
    { key: 'content:publish', description: 'Publish content' },
    { key: 'analytics:read', description: 'View analytics' },
  ];

  const permissions = await Promise.all(
    permissionData.map((perm) =>
      prisma.permission.upsert({
        where: { tenantId_key: { tenantId: defaultTenant.id, key: perm.key } },
        update: {},
        create: {
          tenantId: defaultTenant.id,
          key: perm.key,
          description: perm.description,
        },
      }),
    ),
  );

  console.log(`✓ Created ${permissions.length} permissions\n`);

  // Create roles with different permission sets
  console.log('👥 Creating roles...');

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Admin' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Admin',
      description: 'Full system access',
    },
  });

  // Assign all permissions to Admin
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

  const editorRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Editor' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Editor',
      description: 'Can create and edit content',
    },
  });

  // Assign content permissions to Editor
  const editorPermissions = permissions.filter((p) =>
    ['content:read', 'content:write', 'users:read'].includes(p.key),
  );
  for (const permission of editorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: editorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: editorRole.id,
        permissionId: permission.id,
      },
    });
  }

  const viewerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Viewer' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Viewer',
      description: 'Read-only access',
    },
  });

  // Assign read permissions to Viewer
  const viewerPermissions = permissions.filter((p) => p.key.endsWith(':read'));
  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: viewerRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(`✓ Created roles: Admin, Editor, Viewer\n`);

  // Create users
  console.log('👤 Creating users...');

  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: defaultTenant.id, email: adminEmail } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      email: adminEmail,
      passwordHash,
      isActive: true,
    },
  });

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

  // Create Editor user
  const editorPassword = await bcrypt.hash('editor123', 10);
  const editorUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: defaultTenant.id, email: 'editor@example.com' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      email: 'editor@example.com',
      passwordHash: editorPassword,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: editorUser.id,
        roleId: editorRole.id,
      },
    },
    update: {},
    create: {
      userId: editorUser.id,
      roleId: editorRole.id,
    },
  });

  // Create Viewer user
  const viewerPassword = await bcrypt.hash('viewer123', 10);
  const viewerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: defaultTenant.id, email: 'viewer@example.com' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      email: 'viewer@example.com',
      passwordHash: viewerPassword,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: viewerUser.id,
        roleId: viewerRole.id,
      },
    },
    update: {},
    create: {
      userId: viewerUser.id,
      roleId: viewerRole.id,
    },
  });

  console.log(`✓ Created users: admin, editor, viewer\n`);

  // Create sample applications
  console.log('📱 Creating applications...');

  const clientId1 = randomBytes(16).toString('hex');
  const clientSecret1 = randomBytes(32).toString('hex');
  const clientSecretHash1 = await bcrypt.hash(clientSecret1, 10);

  const webApp = await prisma.application.upsert({
    where: { clientId: clientId1 },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Web Application',
      clientId: clientId1,
      clientSecret: clientSecretHash1,
      redirectUris: ['http://localhost:4000/callback', 'https://app.acme.com/callback'],
    },
  });

  const clientId2 = randomBytes(16).toString('hex');
  const clientSecret2 = randomBytes(32).toString('hex');
  const clientSecretHash2 = await bcrypt.hash(clientSecret2, 10);

  const mobileApp = await prisma.application.upsert({
    where: { clientId: clientId2 },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Mobile Application',
      clientId: clientId2,
      clientSecret: clientSecretHash2,
      redirectUris: ['acme://auth/callback'],
    },
  });

  console.log(`✓ Created applications: Web, Mobile\n`);

  // Print summary
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   • Tenants: ${defaultTenant.name}, ${demoCorp.name}`);
  console.log(`   • Permissions: ${permissions.length}`);
  console.log(`   • Roles: Admin, Editor, Viewer`);
  console.log(`   • Users: 3 (admin, editor, viewer)`);
  console.log(`   • Applications: ${webApp.name}, ${mobileApp.name}\n`);

  console.log('🔑 Demo Credentials:');
  console.log('   Admin:');
  console.log(`     Email: ${adminEmail}`);
  console.log(`     Password: ${adminPassword}`);
  console.log('   Editor:');
  console.log('     Email: editor@example.com');
  console.log('     Password: editor123');
  console.log('   Viewer:');
  console.log('     Email: viewer@example.com');
  console.log('     Password: viewer123\n');

  console.log('📱 Application Credentials (save these!):');
  console.log(`   ${webApp.name}:`);
  console.log(`     Client ID: ${clientId1}`);
  console.log(`     Client Secret: ${clientSecret1}`);
  console.log(`   ${mobileApp.name}:`);
  console.log(`     Client ID: ${clientId2}`);
  console.log(`     Client Secret: ${clientSecret2}`);
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
