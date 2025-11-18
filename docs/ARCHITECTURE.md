# Universal Auth IDP - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Domain Model](#domain-model)
4. [Component Architecture](#component-architecture)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Extensibility & Integration](#extensibility--integration)
8. [Deployment Architecture](#deployment-architecture)

## System Overview

Universal Auth IDP is a production-ready, multi-tenant Identity Provider (IDP) built with TypeScript, NestJS, and Prisma. It provides comprehensive authentication and authorization services with support for multiple authentication strategies, role-based access control, and extensive audit capabilities.

### Key Capabilities
- **Multi-Tenancy**: Complete tenant isolation with per-tenant configuration
- **Authentication**: JWT-based auth, OAuth 2.0, Magic Links, Social Login
- **Authorization**: Role-Based Access Control (RBAC) with granular permissions
- **Audit & Compliance**: Comprehensive audit logging and login tracking
- **API Keys**: Long-lived service account tokens with scoped permissions
- **Webhooks**: Event-driven integrations with external systems
- **Extensibility**: Adapter pattern for custom implementations

## Architecture Principles

### 1. Multi-Tenant by Design
All data is scoped to tenants, ensuring complete isolation:
- Database-level tenant isolation via `tenantId` foreign keys
- All queries automatically filter by tenant
- Tenant-specific settings and configurations

### 2. Domain-Driven Design
Core business concepts are modeled as first-class entities:
- **Identity Domain**: User, UserProfile, IdentityProviderAccount
- **Authorization Domain**: Role, Permission, RolePermission, UserRole
- **Tenant Domain**: Tenant, TenantSettings
- **Application Domain**: Application (OAuth clients)
- **Security Domain**: Session, MagicLink, ApiKey, LoginAttempt
- **Integration Domain**: Webhook, WebhookDelivery
- **Audit Domain**: AuditLog

### 3. Vertical Slice Architecture
Features are implemented as complete vertical slices from API to database:
```
Controller (HTTP) → Service (Business Logic) → Repository (Prisma) → Database
```

Each module encapsulates:
- DTOs for input validation
- Service layer for business logic
- Controller for HTTP endpoints
- Prisma models for data access

### 4. Event-Driven Architecture
Domain events enable loose coupling and extensibility:
- Events emitted for key business actions
- Handlers can be registered for any event type
- Audit logs and webhooks driven by events

### 5. Adapter Pattern for Integrations
External services accessed through interfaces:
- `INotificationAdapter` for email/SMS
- `IStorageAdapter` for file storage
- `IMetricsAdapter` for observability

## Domain Model

### Entity Relationship Overview

```
┌─────────────┐
│   Tenant    │
└──────┬──────┘
       │ 1:N
       ├──────────┬──────────┬──────────┬──────────┬──────────┐
       │          │          │          │          │          │
┌──────▼──────┐  │          │          │          │          │
│    User     │  │          │          │          │          │
└──────┬──────┘  │          │          │          │          │
       │ 1:1     │          │          │          │          │
┌──────▼──────┐  │ 1:N      │ 1:N      │ 1:N      │ 1:N      │ 1:N
│UserProfile  │  │          │          │          │          │
└─────────────┘  │          │          │          │          │
       │         │          │          │          │          │
       │ M:N  ┌──▼──────┐ ┌─▼────────┐ ┌▼────────┐ ┌▼──────┐ ┌▼────────┐
       └──────│  Role   │ │Permission│ │Application│ │ApiKey │ │ Webhook │
              └──┬──────┘ └────────┬─┘ └──────────┘ └───────┘ └─────────┘
                 │ M:N             │
                 └─────────────────┘
```

### Core Entities

#### Tenant
- The top-level organizational unit
- Isolates all data and configurations
- Has one-to-one relationship with TenantSettings
- Has one-to-many relationships with Users, Roles, Permissions, Applications, ApiKeys, Webhooks

#### User
- Represents an identity within a tenant
- Can have multiple authentication methods (password, social)
- Tracks security metadata (login attempts, account locks)
- Associated with UserProfile for personal information
- Assigned Roles through UserRole join table

#### Role & Permission
- RBAC implementation
- Roles are collections of Permissions
- Permissions are fine-grained capabilities (e.g., "users:read", "content:write")
- Many-to-many through RolePermission join table
- Users assigned Roles through UserRole join table

#### Application
- OAuth 2.0 clients
- Each application has clientId and clientSecret
- Defines allowed redirect URIs
- Scoped to a tenant

#### ApiKey
- Long-lived service account tokens
- Scoped permissions via `scopes` array
- Optional expiration
- Tracks usage via `lastUsedAt`
- Can be active/inactive

#### Webhook
- Event subscriptions for external integrations
- Subscribes to specific event types
- Includes secret for HMAC signature verification
- Tracks delivery attempts through WebhookDelivery

#### AuditLog
- Immutable record of system events
- Captures actor, action, resource, metadata
- Includes IP address and user agent
- Status tracking (success, failure, pending)

## Component Architecture

### Application Layer (apps/)

#### API (apps/api/)
NestJS application providing REST API:

```
apps/api/src/
├── auth/              # Authentication endpoints & strategies
│   ├── dto/           # Request/response DTOs
│   ├── guards/        # JWT & OAuth guards
│   ├── strategies/    # Passport strategies
│   ├── decorators/    # Custom decorators
│   └── auth.service.ts
├── tenants/           # Tenant management
├── users/             # User management
├── roles/             # Role management
├── permissions/       # Permission management
├── applications/      # OAuth application management
├── api-keys/          # API key management
├── webhooks/          # Webhook management
├── audit-logs/        # Audit log access
├── lib/               # Shared utilities
│   ├── events/        # Domain events & event emitter
│   ├── adapters/      # Integration adapters
│   └── logger.ts      # Structured logging
├── prisma/            # Database schema & migrations
└── common/            # Common filters, pipes, guards
```

#### Admin (apps/admin/)
Next.js admin dashboard:
- Tenant management UI
- User & role administration
- Application configuration
- Audit log viewer
- Webhook configuration

### Shared Layer (packages/)

#### auth-core (packages/auth-core/)
Shared types and utilities:
- TypeScript interfaces for tokens, requests
- Validation utilities
- Shared constants

## Data Flow

### Authentication Flow

```
1. Client → POST /auth/login
           { email, password, tenantSlug }

2. AuthController → AuthService.login()

3. AuthService:
   a. Validate tenant exists
   b. Find user by tenant + email
   c. Verify password hash
   d. Load roles & permissions
   e. Track login attempt (LoginAttempt)
   f. Update user.lastLoginAt, user.lastLoginIp
   g. Emit UserLoggedInEvent
   h. Create audit log entry
   i. Generate JWT tokens (access + refresh)
   j. Store refresh token (Session)

4. Response → { accessToken, refreshToken, expiresIn }

5. Background:
   - EventEmitter processes UserLoggedInEvent
   - Webhooks triggered for "user.logged_in" event
   - Webhook deliveries attempted with retry logic
```

### Authorization Flow

```
1. Client → GET /api/resource
           Authorization: Bearer {accessToken}

2. JwtAuthGuard:
   a. Extract & verify JWT
   b. Load user & permissions
   c. Attach to request.user

3. @RequirePermissions('resource:read') decorator:
   a. Check user.permissions array
   b. Allow/deny request

4. Business logic executes if authorized
```

### API Key Authentication Flow

```
1. Service → POST /api/endpoint
             X-API-Key: idp_abc123...

2. ApiKeyGuard:
   a. Extract API key from header
   b. Verify against hashed keys in database
   c. Check isActive & expiration
   d. Update lastUsedAt
   e. Load scopes into request context

3. Service logic executes with API key scopes
```

### Webhook Delivery Flow

```
1. Domain Event Emitted (e.g., UserRegisteredEvent)

2. EventEmitter:
   a. Notifies registered handlers
   b. Webhook handler finds matching subscriptions

3. WebhooksService.triggerEvent():
   a. Find active webhooks for event type
   b. For each webhook:
      - Create WebhookDelivery record
      - Generate HMAC signature
      - POST to webhook.url

4. Delivery Retry Logic:
   - Max 3 attempts
   - Exponential backoff: 1min, 5min, 15min
   - Track status in WebhookDelivery
```

## Security Architecture

### Authentication Security

1. **Password Storage**
   - bcrypt hashing with salt rounds = 10
   - Passwords never stored in plain text
   - Password hashes never exposed in API responses

2. **JWT Tokens**
   - Access tokens: Short-lived (15 minutes default)
   - Refresh tokens: Long-lived (7 days default)
   - Token rotation on refresh
   - Stored refresh tokens for invalidation

3. **Account Protection**
   - Failed login tracking (LoginAttempt)
   - Account lockout after N failed attempts (configurable per tenant)
   - Time-based lockout duration
   - IP address and user agent tracking

4. **API Keys**
   - Cryptographically secure random generation
   - bcrypt hashing before storage
   - Prefix shown for identification (e.g., "idp_abc12345...")
   - Scope-based permissions
   - Optional expiration dates

### Authorization Security

1. **Role-Based Access Control (RBAC)**
   - Users assigned to Roles
   - Roles granted Permissions
   - Permissions checked on every request
   - Permissions are granular (resource:action format)

2. **Tenant Isolation**
   - All queries scoped by tenantId
   - Cross-tenant access prevented at database level
   - JWT includes tenantId claim
   - Requests validate tenant ownership

### Audit & Compliance

1. **Audit Logging**
   - All security events logged (login, logout, role changes)
   - Immutable audit trail
   - Captures actor, action, resource, timestamp
   - IP address and user agent tracking

2. **Login Attempt Tracking**
   - All login attempts recorded (success and failure)
   - Failed attempt reasons logged
   - Useful for security analysis and threat detection

### Data Protection

1. **Secrets Management**
   - API keys and OAuth secrets hashed
   - Webhook secrets stored securely
   - Environment variables for configuration
   - Never log sensitive data

2. **Input Validation**
   - class-validator for DTO validation
   - Type-safe request handling
   - SQL injection prevention via Prisma
   - XSS prevention via input sanitization

## Extensibility & Integration

### Adapter Pattern

The system uses adapters to decouple from external services:

```typescript
// Notification Adapter
interface INotificationAdapter {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
  sendPushNotification(userId: string, title: string, body: string): Promise<void>;
}

// Storage Adapter
interface IStorageAdapter {
  uploadFile(file: Buffer, path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}

// Metrics Adapter
interface IMetricsAdapter {
  recordCounter(name: string, value: number, tags?: Record<string, string>): void;
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
}
```

Default implementations provided, custom implementations can be injected.

### Event System

Domain events enable loose coupling:

```typescript
// Define events
class UserRegisteredEvent implements DomainEvent {
  type = 'user.registered';
  timestamp = new Date();
  constructor(
    public tenantId: string,
    public data: { userId: string; email: string }
  ) {}
}

// Emit events
await eventEmitter.emit(new UserRegisteredEvent(tenantId, { userId, email }));

// Subscribe to events
eventEmitter.on('user.registered', async (event) => {
  // Custom logic
});
```

Built-in event types:
- `user.registered`, `user.logged_in`, `user.logged_out`
- `role.assigned`, `permission.granted`
- `application.created`, `api_key.created`, `api_key.revoked`
- `tenant.created`

### Webhooks

External systems can subscribe to events via webhooks:

1. Configure webhook with URL and event subscriptions
2. System delivers events via HTTP POST
3. Includes HMAC signature for verification
4. Automatic retry with exponential backoff

## Deployment Architecture

### Containerized Deployment

```
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ API 1 │ │ API 2 │  (NestJS containers)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
┌────────▼────────┐
│   PostgreSQL    │
│  (Multi-tenant) │
└─────────────────┘
         │
┌────────▼────────┐
│      Redis      │
│ (Sessions/Cache)│
└─────────────────┘
```

### Environment Configuration

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT signing
- `JWT_ACCESS_EXPIRATION`: Access token lifetime
- `JWT_REFRESH_EXPIRATION`: Refresh token lifetime
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth config

### Scaling Considerations

1. **Horizontal Scaling**
   - Stateless API servers
   - Session state in Redis (shared)
   - Database connection pooling

2. **Database Optimization**
   - Indexed foreign keys (tenantId, userId, etc.)
   - Composite indexes for common queries
   - Connection pooling via Prisma

3. **Caching Strategy**
   - Redis for session storage
   - Optional caching for role/permission lookups
   - Webhook delivery queue in Redis

## Performance & Monitoring

### Observability

1. **Structured Logging**
   - Logger service with contextual metadata
   - Log levels: DEBUG, INFO, WARN, ERROR
   - Request ID tracking
   - Tenant and user context in logs

2. **Metrics Collection**
   - Via IMetricsAdapter interface
   - Counters: login attempts, API requests
   - Gauges: active sessions
   - Histograms: request latency

3. **Audit Trail**
   - Complete audit log for compliance
   - Searchable and filterable
   - Aggregation for analytics

### Error Handling

1. **Global Exception Filter**
   - Consistent error response format
   - HTTP status codes
   - Error details (development) vs messages (production)
   - Request correlation IDs

2. **Validation Errors**
   - class-validator integration
   - Field-level error messages
   - 400 Bad Request responses

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**
   - TOTP support
   - SMS/Email OTP
   - Backup codes

2. **Advanced RBAC**
   - Attribute-based access control (ABAC)
   - Resource-level permissions
   - Permission inheritance

3. **Social Login Expansion**
   - GitHub, Facebook, LinkedIn
   - SAML support
   - OpenID Connect

4. **Rate Limiting**
   - Per-tenant rate limits
   - Per-user rate limits
   - API key rate limits

5. **Session Management**
   - Active session list
   - Remote session termination
   - Device tracking

6. **Analytics Dashboard**
   - Login trends
   - User activity heatmaps
   - Security event analysis

---

**Document Version**: 1.0
**Last Updated**: 2025-01-18
**Maintained By**: Development Team
