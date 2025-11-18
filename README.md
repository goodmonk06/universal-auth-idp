# Universal Auth IDP

A multi-tenant, multi-application Identity Provider (IDP) built with NestJS, Prisma, PostgreSQL, and Redis. This project provides a complete authentication and authorization solution that can serve multiple applications across different tenants.

## Features

- **Multi-Tenant Architecture**: Isolated user spaces for different organizations
- **Multiple Authentication Methods**:
  - Email + Password
  - Magic Link (passwordless)
  - Social Login (Google OAuth, extensible for others)
- **JWT-based Authentication**: Access tokens + refresh tokens with rotation
- **Role-Based Access Control (RBAC)**: Flexible roles and permissions per tenant
- **Application Management**: Register client applications with OAuth-style credentials
- **Token Introspection**: Validate tokens from microservices
- **Admin Dashboard**: Next.js UI for managing tenants, users, roles, and applications

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  (Your apps that need authentication)                       │
└────────────┬────────────────────────────────────────────────┘
             │
             │ JWT Token Validation
             │
┌────────────▼────────────────────────────────────────────────┐
│              Universal Auth IDP (This Repo)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth API   │  │  Admin UI    │  │   Database   │     │
│  │   (NestJS)   │  │  (Next.js)   │  │ (PostgreSQL) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐                                           │
│  │    Redis     │  (Session & Cache)                       │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **API (NestJS)**: Core authentication and authorization service
   - `/api/auth/*` - Authentication endpoints
   - `/api/oauth/introspect` - Token validation for client apps
   - `/api/tenants/*` - Tenant management
   - `/api/tenants/:id/users` - User management
   - `/api/tenants/:id/roles` - Role management
   - `/api/tenants/:id/permissions` - Permission management
   - `/api/tenants/:id/applications` - Application management

2. **Admin UI (Next.js)**: Dashboard for managing the IDP
   - Login page
   - Tenant management
   - User management per tenant
   - Role and permission management
   - Application registration

3. **Shared Core Package**: Common types and utilities used across the monorepo

## Tech Stack

- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache/Sessions**: Redis
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Authentication**: JWT (jsonwebtoken)
- **Social Auth**: Passport.js (Google OAuth)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd universal-auth-idp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - Database connection (`DATABASE_URL`)
   - Redis connection (`REDIS_URL`)
   - JWT secrets
   - Google OAuth credentials (optional)
   - Email service for magic links (optional)

4. **Set up the database**:
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. **Seed the database** (creates default tenant and admin user):
   ```bash
   cd apps/api
   npm run prisma:seed
   ```

   This will create:
   - A default tenant with slug `default`
   - An admin user (check console output for credentials)
   - Sample permissions and roles
   - A sample application with client credentials

### Running the Application

**Development mode** (runs both API and Admin UI):
```bash
npm run dev
```

- API will be available at: http://localhost:3000
- Admin UI will be available at: http://localhost:3001

**Production build**:
```bash
npm run build
npm run start
```

### Default Credentials

After running the seed script, you can log in to the admin UI with:

- **Email**: `admin@example.com` (or value from `PLATFORM_ADMIN_EMAIL` in .env)
- **Password**: `admin123` (or value from `PLATFORM_ADMIN_PASSWORD` in .env)

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
│   │       ├── tenants/        # Tenant management
│   │       ├── users/          # User management
│   │       ├── roles/          # Role management
│   │       ├── permissions/    # Permission management
│   │       ├── applications/   # App registration
│   │       ├── oauth/          # Token introspection
│   │       ├── prisma/         # Prisma service
│   │       └── redis/          # Redis service
│   │
│   └── admin/                  # Next.js Admin UI
│       └── src/
│           ├── app/            # App router pages
│           ├── components/     # React components
│           └── lib/            # Utilities (API client)
│
├── packages/
│   └── auth-core/              # Shared types & utilities
│       └── src/
│           ├── types/          # TypeScript interfaces
│           └── utils/          # Helper functions
│
├── .env.example                # Environment template
└── package.json                # Root package.json
```

## Database Schema

The system uses the following main entities:

- **Tenant**: Organizations that use the IDP
- **User**: End users belonging to a tenant
- **Role**: Named roles within a tenant (e.g., Admin, Editor)
- **Permission**: Granular permissions (e.g., users:read, users:write)
- **Application**: Client apps registered with the IDP
- **Session**: Refresh token storage
- **MagicLink**: One-time login tokens
- **IdentityProviderAccount**: Social login connections

## How Client Applications Use This IDP

### 1. Register Your Application

Use the Admin UI to register your application:

1. Navigate to a tenant
2. Go to Applications
3. Create a new application with redirect URIs
4. Save the `clientId` and `clientSecret` (shown only once!)

### 2. Direct Users to Login

Redirect users to your IDP login flow or integrate the API endpoints:

```javascript
// Example: Login from your client app
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    tenantSlug: 'default',
  }),
});

const { accessToken, refreshToken } = await response.json();

// Store tokens securely
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### 3. Validate Tokens in Your Microservices

Your backend services can validate tokens using the introspection endpoint:

```javascript
// Node.js microservice example
const axios = require('axios');

async function validateToken(token) {
  const response = await axios.post('http://localhost:3000/api/oauth/introspect', {
    token: token,
  });

  const { active, userId, tenantId, permissions } = response.data;

  if (!active) {
    throw new Error('Invalid token');
  }

  return { userId, tenantId, permissions };
}

// Middleware example (Express.js)
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = await validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.use(authMiddleware);
```

### 4. Verify JWT Locally (Alternative to Introspection)

For better performance, you can verify JWTs directly in your services without calling the introspection endpoint:

```javascript
const jwt = require('jsonwebtoken');

function verifyToken(token, jwtSecret) {
  try {
    const payload = jwt.verify(token, jwtSecret);

    // Check if it's an access token (not refresh)
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      roleKeys: payload.roleKeys,
      permissions: payload.permissions,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Usage
const jwtSecret = process.env.JWT_SECRET; // Same secret as IDP
const user = verifyToken(accessToken, jwtSecret);

// Check permissions
if (!user.permissions.includes('users:write')) {
  throw new Error('Insufficient permissions');
}
```

### 5. Refresh Tokens

Access tokens are short-lived. Use refresh tokens to get new access tokens:

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const { accessToken, refreshToken: newRefreshToken } = await response.json();

  // Update stored tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);

  return accessToken;
}
```

## Authentication Flows

### Email + Password Flow

```
Client App → POST /api/auth/signup (or /login)
           ← { accessToken, refreshToken }
```

### Magic Link Flow

```
Client App → POST /api/auth/magic-link { email }
           ← { message: "Magic link sent" }

User clicks link → GET /api/auth/magic-link/verify?token=xxx
                 ← { accessToken, refreshToken }
```

### Google OAuth Flow

```
Client App → Redirect to GET /api/auth/google
           → User authorizes on Google
           → Redirected to GET /api/auth/google/callback
           ← { accessToken, refreshToken } (via redirect to client)
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/magic-link` - Request magic link
- `GET /api/auth/magic-link/verify` - Verify magic link token
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate refresh token)
- `GET /api/auth/me` - Get current user info

### OAuth

- `POST /api/oauth/introspect` - Validate token

### Tenants

- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:id` - Get tenant details
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### Users

- `GET /api/tenants/:tenantId/users` - List users in tenant
- `GET /api/tenants/:tenantId/users/:id` - Get user details
- `PUT /api/tenants/:tenantId/users/:id/active` - Activate/deactivate user
- `DELETE /api/tenants/:tenantId/users/:id` - Delete user

### Roles

- `GET /api/tenants/:tenantId/roles` - List roles
- `POST /api/tenants/:tenantId/roles` - Create role
- `PUT /api/tenants/:tenantId/roles/:id` - Update role
- `DELETE /api/tenants/:tenantId/roles/:id` - Delete role
- `POST /api/tenants/:tenantId/roles/assign` - Assign role to user

### Permissions

- `GET /api/tenants/:tenantId/permissions` - List permissions
- `POST /api/tenants/:tenantId/permissions` - Create permission
- `PUT /api/tenants/:tenantId/permissions/:id` - Update permission
- `DELETE /api/tenants/:tenantId/permissions/:id` - Delete permission

### Applications

- `GET /api/tenants/:tenantId/applications` - List applications
- `POST /api/tenants/:tenantId/applications` - Register application
- `PUT /api/tenants/:tenantId/applications/:id` - Update application
- `POST /api/tenants/:tenantId/applications/:id/regenerate-secret` - Regenerate client secret
- `DELETE /api/tenants/:tenantId/applications/:id` - Delete application

## Security Considerations

1. **Secrets**: Always use strong secrets for `JWT_SECRET` and `MAGIC_LINK_SECRET` in production
2. **HTTPS**: Use HTTPS in production for all communications
3. **CORS**: Configure CORS properly for your client applications
4. **Rate Limiting**: The API includes throttling (10 requests per minute by default)
5. **Password Hashing**: Passwords are hashed using bcrypt with salt rounds of 10
6. **Token Expiration**: Access tokens expire quickly (15 minutes default), refresh tokens last longer (7 days default)
7. **Refresh Token Rotation**: Refresh tokens are rotated on each use for better security

## Customization

### Adding New Social Providers

1. Install the Passport strategy: `npm install passport-facebook`
2. Create a new strategy in `apps/api/src/auth/strategies/`
3. Add it to the `AuthModule` providers
4. Create the OAuth flow endpoints in `AuthController`
5. Update `IdentityProviderAccount` handling in `AuthService`

### Adding New Permissions

Permissions are flexible. Create them via the API or Admin UI:

```javascript
POST /api/tenants/:tenantId/permissions
{
  "key": "posts:publish",
  "description": "Publish blog posts"
}
```

Then assign permissions to roles, and roles to users.

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `npm run prisma:migrate` to apply migrations

### Redis Connection Issues

- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check `REDIS_URL` in `.env`

### Google OAuth Not Working

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Ensure `GOOGLE_CALLBACK_URL` matches the redirect URI in Google Console
- Add `http://localhost:3000/api/auth/google/callback` to authorized redirect URIs

## Development

### Running Tests

```bash
npm run test
```

### Database Migrations

Create a new migration:
```bash
cd apps/api
npx prisma migrate dev --name your_migration_name
```

### Prisma Studio

View and edit data:
```bash
npm run prisma:studio
```

## Production Deployment

1. Set all environment variables properly
2. Use strong, unique secrets
3. Configure proper CORS origins
4. Use HTTPS
5. Set up database backups
6. Monitor Redis memory usage
7. Consider horizontal scaling with load balancers
8. Set `NODE_ENV=production`

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For questions or issues, please open a GitHub issue.
