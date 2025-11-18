# Universal Auth IDP

A production-ready, multi-tenant Identity Provider (IDP) with comprehensive RBAC, built for modern applications.

## Overview

Universal Auth IDP is a centralized authentication and authorization solution that supports multiple tenants and applications. It provides a complete auth infrastructure so you can focus on building your applications instead of reinventing auth.

**Key Features:**
- 🏢 Multi-tenant architecture with complete isolation
- 🔐 Multiple authentication methods (Email/Password, Magic Link, Social OAuth)
- 👥 Flexible Role-Based Access Control (RBAC)
- 🔑 JWT tokens with automatic refresh token rotation
- 📱 Application registration and OAuth-style client credentials
- 🗝️ API Keys for service-to-service authentication
- 🪝 Webhooks for event-driven integrations
- 📋 Comprehensive audit logging and security tracking
- 👤 Rich user profiles with customizable metadata
- ⚙️ Per-tenant settings and branding
- 🎯 Token introspection for microservices
- 🖥️ Admin dashboard for management
- 🐳 Docker-ready with compose files
- ✅ Type-safe APIs end-to-end
- 🔌 Extensible adapter pattern for integrations

## Tech Stack

| Layer | Technology |
|-------|------------|
| **API** | NestJS + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache/Sessions** | Redis |
| **Admin UI** | Next.js 14 + React + Tailwind CSS |
| **Auth** | JWT + Passport.js |
| **Testing** | Vitest + Jest |
| **Deployment** | Docker + Docker Compose |

## Domain Model Summary

```
Tenant
  ├── Users (email/password + social logins)
  ├── Roles (Admin, Editor, Viewer, etc.)
  ├── Permissions (users:read, content:write, etc.)
  └── Applications (registered client apps)

User ──→ Roles ──→ Permissions
```

**Core Entities:**
- **Tenant**: Organization/workspace with isolated data
- **User**: End users with email/password or social login
- **UserProfile**: Rich user information (name, avatar, bio, metadata)
- **Role**: Named role (e.g., "Admin") with assigned permissions
- **Permission**: Granular permission (e.g., "users:write")
- **Application**: Registered client app with OAuth credentials
- **ApiKey**: Long-lived service account tokens with scopes
- **Webhook**: Event subscriptions for external integrations
- **AuditLog**: Immutable security and activity tracking
- **Session**: Refresh token storage with expiration
- **TenantSettings**: Per-tenant configuration and branding

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (recommended)
- PostgreSQL 14+ (if not using Docker)
- Redis 7+ (if not using Docker)

### Option 1: Quick Start with Docker (Recommended)

**1. Clone and setup:**
```bash
git clone <repository-url>
cd universal-auth-idp
cp .env.example .env
```

**2. Start everything with Docker:**
```bash
# Start databases, API, and Admin UI
npm run docker:up

# View logs
npm run docker:logs

# Stop everything
npm run docker:down
```

The services will be available at:
- API: http://localhost:3000
- Admin UI: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Option 2: Local Development

**1. Install dependencies:**
```bash
npm install
```

**2. Start databases only:**
```bash
npm run dev:db
```

**3. Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

**4. Run database migrations:**
```bash
npm run db:push
npm run prisma:generate
```

**5. Seed the database:**
```bash
npm run db:seed
```

**6. Start development servers:**
```bash
# Start both API and Admin UI
npm run dev

# Or start them separately:
npm run dev:api
npm run dev:admin
```

### Demo Credentials

After seeding, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@example.com | admin123 |
| **Editor** | editor@example.com | editor123 |
| **Viewer** | viewer@example.com | viewer123 |

## Example Flow: Complete Vertical Slice

This demonstrates a complete end-to-end flow through the IDP:

### 1. Create a Tenant

```bash
POST /api/tenants
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "slug": "acme-corp"
}
```

### 2. Register a User

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "john@acme.com",
  "password": "securePass123",
  "tenantSlug": "acme-corp"
}

# Returns:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

### 3. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@acme.com",
  "password": "securePass123",
  "tenantSlug": "acme-corp"
}
```

### 4. Create a Role

```bash
POST /api/tenants/{tenantId}/roles
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Content Manager",
  "description": "Can manage content",
  "permissionIds": ["perm-id-1", "perm-id-2"]
}
```

### 5. Assign Role to User

```bash
POST /api/tenants/{tenantId}/roles/assign
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "userId": "user-id",
  "roleId": "role-id"
}
```

### 6. Verify Permissions

```bash
GET /api/auth/me
Authorization: Bearer <user-token>

# Returns:
{
  "userId": "...",
  "email": "john@acme.com",
  "tenantId": "...",
  "roleKeys": ["Content Manager"],
  "permissions": ["content:read", "content:write"]
}
```

### 7. Register an Application

```bash
POST /api/tenants/{tenantId}/applications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "My Web App",
  "redirectUris": ["http://localhost:4000/callback"]
}

# Returns (save these!):
{
  "clientId": "abc123...",
  "clientSecret": "secret123...",
  "redirectUris": ["http://localhost:4000/callback"]
}
```

### 8. Introspect Token (from your microservice)

```bash
POST /api/oauth/introspect
Content-Type: application/json

{
  "token": "eyJhbGc..."
}

# Returns:
{
  "active": true,
  "userId": "...",
  "tenantId": "...",
  "email": "john@acme.com",
  "roleKeys": ["Content Manager"],
  "permissions": ["content:read", "content:write"],
  "exp": 1234567890
}
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API and Admin UI in dev mode |
| `npm run dev:db` | Start PostgreSQL and Redis with Docker |
| `npm run build` | Build all workspaces |
| `npm run start` | Start production servers |
| `npm test` | Run all tests |
| `npm run lint` | Lint all workspaces |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes to DB |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | Start all services with Docker |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:build` | Rebuild Docker images |

## Project Structure

```
universal-auth-idp/
├── apps/
│   ├── api/                    # NestJS API
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Database seeder
│   │   └── src/
│   │       ├── auth/           # Authentication module
│   │       │   ├── dto/        # Validation DTOs
│   │       │   ├── guards/     # Auth guards
│   │       │   └── strategies/ # Passport strategies
│   │       ├── tenants/        # Tenant management
│   │       ├── users/          # User management
│   │       ├── roles/          # Role management
│   │       ├── permissions/    # Permission management
│   │       ├── applications/   # App registration
│   │       ├── oauth/          # Token introspection
│   │       └── common/
│   │           └── filters/    # Error filters
│   │
│   └── admin/                  # Next.js Admin UI
│       └── src/
│           ├── app/            # App router pages
│           ├── components/     # React components
│           └── lib/            # API client
│
├── packages/
│   └── auth-core/              # Shared types & utilities
│       └── src/
│           ├── types/          # TypeScript interfaces
│           └── utils/          # Helper functions
│
├── docker-compose.yml          # Production compose
├── docker-compose.dev.yml      # Development compose
└── .env.example                # Environment template
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run API tests
npm run test:api

# Run tests in watch mode
cd packages/auth-core && npm run test:watch
```

### Test Coverage

The project includes:
- **Unit tests** for utilities and services
- **Integration tests** for critical flows
- **Type safety** via TypeScript across the stack

Example test locations:
- `packages/auth-core/src/utils/index.spec.ts` - Utility functions
- `apps/api/src/roles/roles.service.spec.ts` - Role service logic

## Integration Guide

### Validating Tokens in Your Microservice

**Option 1: JWT Verification (Fast)**

```javascript
const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      permissions: payload.permissions,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Express middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

**Option 2: Introspection (More Secure)**

```javascript
const axios = require('axios');

async function introspectToken(token) {
  const response = await axios.post('http://localhost:3000/api/oauth/introspect', {
    token,
  });

  if (!response.data.active) {
    throw new Error('Token is not active');
  }

  return response.data;
}

// Usage
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    req.user = await introspectToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

### Permission Checking

```javascript
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage
app.post('/api/posts', requirePermission('content:write'), (req, res) => {
  // Handler
});
```

## Security Best Practices

✅ **Implemented:**
- Password hashing with bcrypt (10 salt rounds)
- JWT tokens with short expiration (15 min access, 7 days refresh)
- Refresh token rotation on each use
- Input validation with class-validator
- Centralized error handling
- CORS configuration
- Rate limiting (10 req/min per IP)

🔒 **Production Recommendations:**
- Use strong, unique secrets for `JWT_SECRET` and `MAGIC_LINK_SECRET`
- Enable HTTPS for all communications
- Configure proper CORS origins
- Use Redis persistence in production
- Set up database backups
- Monitor failed login attempts
- Implement 2FA for admin accounts
- Rotate application secrets regularly

## Docker Deployment

### Development

```bash
# Start only databases
npm run dev:db

# Run API and Admin locally
npm run dev
```

### Production

```bash
# Build images
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Environment Variables

Copy `.env.example` to `.env` and configure:
- Database credentials
- Redis connection
- JWT secrets
- OAuth credentials
- Email service settings

## Future Extensions

Potential enhancements for this IDP:

- **Advanced Auth**: WebAuthn/FIDO2 support, SMS OTP
- **MFA**: Time-based OTP, backup codes
- **Advanced RBAC**: Conditional permissions, attribute-based access control
- **UI Improvements**: Better admin dashboard, user profile pages
- **API Rate Limiting**: Per-user/per-tenant rate limits
- **Session Management**: View and revoke active sessions
- **Compliance**: GDPR data export, account deletion workflows
- **Monitoring**: Prometheus metrics, health checks
- **OIDC Support**: Full OpenID Connect implementation
- **SAML**: Enterprise SSO integration

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT

## Support

For questions or issues:
- Open a GitHub issue
- Check the docs in this README
- Review the inline code comments

---

Built with ❤️ for developers who need auth without the headache.
