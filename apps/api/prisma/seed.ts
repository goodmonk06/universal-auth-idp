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

  // Create user profiles
  console.log('👤 Creating user profiles...');

  await prisma.userProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      firstName: 'Alice',
      lastName: 'Anderson',
      displayName: 'Alice Anderson',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      bio: 'Platform administrator with expertise in security and compliance',
      phoneNumber: '+1-555-0101',
      timezone: 'America/New_York',
      locale: 'en-US',
      metadata: {
        department: 'IT',
        employeeId: 'EMP001',
        startDate: '2020-01-15',
      },
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: editorUser.id },
    update: {},
    create: {
      userId: editorUser.id,
      firstName: 'Bob',
      lastName: 'Baker',
      displayName: 'Bob Baker',
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
      bio: 'Content editor focused on creating engaging user experiences',
      phoneNumber: '+1-555-0102',
      timezone: 'America/Los_Angeles',
      locale: 'en-US',
      metadata: {
        department: 'Content',
        employeeId: 'EMP002',
        startDate: '2021-03-20',
      },
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: viewerUser.id },
    update: {},
    create: {
      userId: viewerUser.id,
      firstName: 'Carol',
      lastName: 'Chen',
      displayName: 'Carol Chen',
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
      bio: 'Data analyst specializing in user behavior analytics',
      phoneNumber: '+1-555-0103',
      timezone: 'America/Chicago',
      locale: 'en-US',
      metadata: {
        department: 'Analytics',
        employeeId: 'EMP003',
        startDate: '2022-06-10',
      },
    },
  });

  console.log('✓ Created 3 user profiles\n');

  // Create tenant settings
  console.log('⚙️  Creating tenant settings...');

  await prisma.tenantSettings.upsert({
    where: { tenantId: defaultTenant.id },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      requireEmailVerification: true,
      allowSelfRegistration: true,
      allowSocialLogin: true,
      sessionDuration: 604800, // 7 days
      maxFailedLogins: 5,
      lockoutDuration: 900, // 15 minutes
      logoUrl: 'https://via.placeholder.com/200x50/4F46E5/FFFFFF?text=ACME',
      primaryColor: '#4F46E5',
      companyName: 'Acme Corporation',
      supportEmail: 'support@acme.com',
      webhookSecret: randomBytes(32).toString('hex'),
      rateLimit: 100,
      metadata: {
        industry: 'Technology',
        size: 'Enterprise',
        features: ['sso', 'mfa', 'audit-logs'],
      },
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: demoCorp.id },
    update: {},
    create: {
      tenantId: demoCorp.id,
      requireEmailVerification: false,
      allowSelfRegistration: true,
      allowSocialLogin: true,
      sessionDuration: 86400, // 1 day
      maxFailedLogins: 3,
      lockoutDuration: 600, // 10 minutes
      rateLimit: 50,
      metadata: {
        industry: 'Demo',
        size: 'Small',
      },
    },
  });

  console.log('✓ Created tenant settings\n');

  // Create API keys
  console.log('🔑 Creating API keys...');

  const apiKeyPlain1 = `idp_${randomBytes(32).toString('hex')}`;
  const apiKeyHash1 = await bcrypt.hash(apiKeyPlain1, 10);
  const apiKey1 = await prisma.apiKey.create({
    data: {
      tenantId: defaultTenant.id,
      name: 'Production API Key',
      keyHash: apiKeyHash1,
      prefix: apiKeyPlain1.substring(0, 12),
      scopes: ['users:read', 'users:write', 'roles:read'],
      expiresAt: null,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  const apiKeyPlain2 = `idp_${randomBytes(32).toString('hex')}`;
  const apiKeyHash2 = await bcrypt.hash(apiKeyPlain2, 10);
  const apiKey2 = await prisma.apiKey.create({
    data: {
      tenantId: defaultTenant.id,
      name: 'Analytics Service Key',
      keyHash: apiKeyHash2,
      prefix: apiKeyPlain2.substring(0, 12),
      scopes: ['analytics:read'],
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      isActive: true,
      createdById: adminUser.id,
    },
  });

  console.log('✓ Created 2 API keys\n');

  // Create webhooks
  console.log('🪝 Creating webhooks...');

  const webhook1 = await prisma.webhook.create({
    data: {
      tenantId: defaultTenant.id,
      url: 'https://api.acme.com/webhooks/auth-events',
      events: ['user.registered', 'user.logged_in', 'user.logged_out'],
      secret: randomBytes(32).toString('hex'),
      isActive: true,
      description: 'Authentication events webhook for analytics',
    },
  });

  const webhook2 = await prisma.webhook.create({
    data: {
      tenantId: defaultTenant.id,
      url: 'https://api.acme.com/webhooks/security',
      events: ['user.login_failed', 'role.assigned', 'permission.granted'],
      secret: randomBytes(32).toString('hex'),
      isActive: true,
      description: 'Security events webhook for monitoring',
    },
  });

  console.log('✓ Created 2 webhooks\n');

  // Create sample audit logs
  console.log('📋 Creating audit logs...');

  const auditLogs = [
    {
      tenantId: defaultTenant.id,
      actorId: adminUser.id,
      action: 'user.created',
      resource: 'User',
      resourceId: editorUser.id,
      metadata: { email: editorUser.email },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    {
      tenantId: defaultTenant.id,
      actorId: adminUser.id,
      action: 'role.assigned',
      resource: 'UserRole',
      resourceId: editorUser.id,
      metadata: { roleName: 'Editor' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      tenantId: defaultTenant.id,
      actorId: editorUser.id,
      action: 'user.logged_in',
      resource: 'User',
      resourceId: editorUser.id,
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'success',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      tenantId: defaultTenant.id,
      actorId: null,
      action: 'user.login_failed',
      resource: 'User',
      resourceId: viewerUser.id,
      metadata: { email: viewerUser.email },
      ipAddress: '192.168.1.200',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      status: 'failure',
      errorMessage: 'Invalid password',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      tenantId: defaultTenant.id,
      actorId: adminUser.id,
      action: 'api_key.created',
      resource: 'ApiKey',
      resourceId: apiKey1.id,
      metadata: { name: apiKey1.name, scopes: apiKey1.scopes },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('✓ Created 5 audit log entries\n');

  // Create sample login attempts
  console.log('🔐 Creating login attempts...');

  const loginAttempts = [
    {
      userId: adminUser.id,
      email: adminUser.email,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      successful: true,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      userId: editorUser.id,
      email: editorUser.email,
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      successful: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      userId: viewerUser.id,
      email: viewerUser.email,
      ipAddress: '192.168.1.200',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      successful: false,
      failReason: 'Invalid password',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      userId: null,
      email: 'attacker@evil.com',
      ipAddress: '203.0.113.42',
      userAgent: 'python-requests/2.28.0',
      successful: false,
      failReason: 'User not found or inactive',
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    },
  ];

  for (const attempt of loginAttempts) {
    await prisma.loginAttempt.create({ data: attempt });
  }

  console.log('✓ Created 4 login attempts\n');

  // Print summary
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   • Tenants: ${defaultTenant.name}, ${demoCorp.name}`);
  console.log(`   • Tenant Settings: 2`);
  console.log(`   • Permissions: ${permissions.length}`);
  console.log(`   • Roles: Admin, Editor, Viewer`);
  console.log(`   • Users: 3 (admin, editor, viewer)`);
  console.log(`   • User Profiles: 3 with persona details`);
  console.log(`   • Applications: ${webApp.name}, ${mobileApp.name}`);
  console.log(`   • API Keys: 2 (production, analytics)`);
  console.log(`   • Webhooks: 2 (auth events, security)`);
  console.log(`   • Audit Logs: 5 historical entries`);
  console.log(`   • Login Attempts: 4 (including failed attempts)\n`);

  console.log('🔑 Demo Credentials:');
  console.log('   Admin (Alice Anderson - IT Department):');
  console.log(`     Email: ${adminEmail}`);
  console.log(`     Password: ${adminPassword}`);
  console.log('     Permissions: Full system access');
  console.log('   Editor (Bob Baker - Content Department):');
  console.log('     Email: editor@example.com');
  console.log('     Password: editor123');
  console.log('     Permissions: Content read/write, Users read');
  console.log('   Viewer (Carol Chen - Analytics Department):');
  console.log('     Email: viewer@example.com');
  console.log('     Password: viewer123');
  console.log('     Permissions: Read-only access\n');

  console.log('📱 Application Credentials (save these!):');
  console.log(`   ${webApp.name}:`);
  console.log(`     Client ID: ${clientId1}`);
  console.log(`     Client Secret: ${clientSecret1}`);
  console.log(`   ${mobileApp.name}:`);
  console.log(`     Client ID: ${clientId2}`);
  console.log(`     Client Secret: ${clientSecret2}\n`);

  console.log('🔑 API Keys (save these!):');
  console.log(`   Production API Key:`);
  console.log(`     Plain Key: ${apiKeyPlain1}`);
  console.log(`     Scopes: users:read, users:write, roles:read`);
  console.log(`   Analytics Service Key:`);
  console.log(`     Plain Key: ${apiKeyPlain2}`);
  console.log(`     Scopes: analytics:read`);
  console.log(`     Expires: 90 days\n`);

  console.log('ℹ️  Additional Data:');
  console.log('   • User profiles include realistic persona details');
  console.log('   • Audit logs show recent activity history');
  console.log('   • Login attempts include both successful and failed attempts');
  console.log('   • Webhooks configured for auth and security events');
  console.log('   • Tenant settings include branding and security policies');
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
