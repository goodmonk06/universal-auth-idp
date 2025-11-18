# API Guide - Universal Auth IDP

## Table of Contents
1. [Authentication](#authentication)
2. [Users](#users)
3. [Roles & Permissions](#roles--permissions)
4. [API Keys](#api-keys)
5. [Webhooks](#webhooks)
6. [Audit Logs](#audit-logs)
7. [Error Handling](#error-handling)

## Authentication

### Sign Up

Create a new user account.

**Endpoint**: `POST /auth/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "tenantSlug": "acme-corp"
}
```

**Response** (201 Created):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Validation Rules**:
- `email`: Must be valid email format
- `password`: Minimum 8 characters
- `tenantSlug`: Optional, defaults to "default"

---

### Login

Authenticate with email and password.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "tenantSlug": "acme-corp"
}
```

**Response** (201 Created):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Cases**:
- 401 Unauthorized: Invalid credentials
- 401 Unauthorized: Account locked due to failed login attempts

**Security Notes**:
- Failed attempts are tracked and logged
- Account locks after N failures (configurable per tenant)
- IP address and user agent are recorded

---

### Refresh Token

Get new access token using refresh token.

**Endpoint**: `POST /auth/refresh`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (201 Created):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Notes**:
- Old refresh token is invalidated
- New refresh token is issued (token rotation)

---

### Logout

Invalidate refresh token.

**Endpoint**: `POST /auth/logout`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (201 Created):
```json
{
  "message": "Logged out successfully"
}
```

---

### Magic Link

Request a passwordless login link.

**Endpoint**: `POST /auth/magic-link`

**Request Body**:
```json
{
  "email": "user@example.com",
  "tenantSlug": "acme-corp"
}
```

**Response** (201 Created):
```json
{
  "message": "Magic link sent to your email"
}
```

**Verify Magic Link**:

**Endpoint**: `GET /auth/magic-link/verify?token={token}`

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

### Get Current User

Get authenticated user details.

**Endpoint**: `GET /auth/me`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "sub": "user-id-123",
  "tenantId": "tenant-id-456",
  "email": "user@example.com",
  "roleKeys": ["Editor"],
  "permissions": ["content:read", "content:write", "users:read"]
}
```

---

## Users

### List Users

**Endpoint**: `GET /tenants/{tenantId}/users`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by email

**Response** (200 OK):
```json
{
  "users": [
    {
      "id": "user-123",
      "email": "alice@example.com",
      "isActive": true,
      "emailVerified": true,
      "lastLoginAt": "2025-01-18T10:30:00Z",
      "createdAt": "2024-12-01T00:00:00Z",
      "profile": {
        "firstName": "Alice",
        "lastName": "Anderson",
        "displayName": "Alice Anderson",
        "avatarUrl": "https://..."
      },
      "roles": ["Admin"]
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### Get User by ID

**Endpoint**: `GET /users/{userId}`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "id": "user-123",
  "tenantId": "tenant-456",
  "email": "alice@example.com",
  "isActive": true,
  "emailVerified": true,
  "lastLoginAt": "2025-01-18T10:30:00Z",
  "lastLoginIp": "192.168.1.100",
  "failedLoginCount": 0,
  "createdAt": "2024-12-01T00:00:00Z",
  "updatedAt": "2025-01-18T10:30:00Z",
  "profile": {
    "firstName": "Alice",
    "lastName": "Anderson",
    "displayName": "Alice Anderson",
    "avatarUrl": "https://...",
    "bio": "Platform administrator",
    "phoneNumber": "+1-555-0101",
    "timezone": "America/New_York",
    "locale": "en-US"
  },
  "roles": [
    {
      "id": "role-789",
      "name": "Admin",
      "description": "Full system access"
    }
  ]
}
```

---

## Roles & Permissions

### List Roles

**Endpoint**: `GET /tenants/{tenantId}/roles`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
[
  {
    "id": "role-123",
    "name": "Admin",
    "description": "Full system access",
    "permissions": [
      {
        "id": "perm-1",
        "key": "users:read",
        "description": "View users"
      },
      {
        "id": "perm-2",
        "key": "users:write",
        "description": "Create and update users"
      }
    ],
    "createdAt": "2024-12-01T00:00:00Z"
  }
]
```

---

### Create Role

**Endpoint**: `POST /tenants/{tenantId}/roles`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "name": "Content Manager",
  "description": "Manages content and users",
  "permissionIds": ["perm-1", "perm-2", "perm-3"]
}
```

**Response** (201 Created):
```json
{
  "id": "role-456",
  "name": "Content Manager",
  "description": "Manages content and users",
  "permissions": [...],
  "createdAt": "2025-01-18T11:00:00Z"
}
```

---

### Assign Role to User

**Endpoint**: `POST /roles/assign`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "userId": "user-123",
  "roleId": "role-456"
}
```

**Response** (201 Created):
```json
{
  "message": "Role assigned successfully"
}
```

---

### List Permissions

**Endpoint**: `GET /tenants/{tenantId}/permissions`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
[
  {
    "id": "perm-1",
    "key": "users:read",
    "description": "View users"
  },
  {
    "id": "perm-2",
    "key": "users:write",
    "description": "Create and update users"
  }
]
```

---

## API Keys

### Create API Key

**Endpoint**: `POST /tenants/{tenantId}/api-keys`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "name": "Production API Key",
  "scopes": ["users:read", "users:write"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response** (201 Created):
```json
{
  "apiKey": {
    "id": "key-123",
    "name": "Production API Key",
    "prefix": "idp_abc12345",
    "scopes": ["users:read", "users:write"],
    "expiresAt": "2025-12-31T23:59:59Z",
    "isActive": true,
    "createdAt": "2025-01-18T11:00:00Z"
  },
  "plainKey": "idp_abc12345def67890ghijklmnopqrstuv..."
}
```

**Important**: Save `plainKey` immediately - it will not be shown again!

---

### List API Keys

**Endpoint**: `GET /tenants/{tenantId}/api-keys`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
[
  {
    "id": "key-123",
    "name": "Production API Key",
    "prefix": "idp_abc12345",
    "scopes": ["users:read", "users:write"],
    "expiresAt": "2025-12-31T23:59:59Z",
    "lastUsedAt": "2025-01-18T10:00:00Z",
    "isActive": true,
    "createdAt": "2025-01-15T00:00:00Z"
  }
]
```

---

### Verify API Key

**Endpoint**: `POST /tenants/{tenantId}/api-keys/verify`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "apiKey": "idp_abc12345def67890ghijklmnopqrstuv..."
}
```

**Response** (201 Created):
```json
{
  "valid": true,
  "scopes": ["users:read", "users:write"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

---

### Update API Key

**Endpoint**: `PATCH /tenants/{tenantId}/api-keys/{keyId}`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "name": "Updated Name",
  "scopes": ["users:read"],
  "isActive": false
}
```

**Response** (200 OK):
```json
{
  "id": "key-123",
  "name": "Updated Name",
  "scopes": ["users:read"],
  "isActive": false
}
```

---

### Rotate API Key

**Endpoint**: `POST /tenants/{tenantId}/api-keys/{keyId}/rotate`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Response** (201 Created):
```json
{
  "apiKey": {
    "id": "key-123",
    "name": "Production API Key",
    "prefix": "idp_xyz98765",
    "scopes": ["users:read", "users:write"]
  },
  "plainKey": "idp_xyz98765new_rotated_key..."
}
```

**Notes**:
- Old key is immediately invalidated
- New key has same configuration
- Save new `plainKey` immediately!

---

## Webhooks

### Create Webhook

**Endpoint**: `POST /tenants/{tenantId}/webhooks`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "url": "https://api.example.com/webhooks/auth",
  "events": ["user.registered", "user.logged_in", "user.logged_out"],
  "description": "Authentication events webhook",
  "secret": "your-webhook-secret"
}
```

**Response** (201 Created):
```json
{
  "id": "webhook-123",
  "url": "https://api.example.com/webhooks/auth",
  "events": ["user.registered", "user.logged_in", "user.logged_out"],
  "description": "Authentication events webhook",
  "isActive": true,
  "createdAt": "2025-01-18T11:00:00Z"
}
```

---

### List Webhooks

**Endpoint**: `GET /tenants/{tenantId}/webhooks`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
[
  {
    "id": "webhook-123",
    "url": "https://api.example.com/webhooks/auth",
    "events": ["user.registered", "user.logged_in"],
    "isActive": true,
    "description": "Authentication events webhook",
    "createdAt": "2025-01-18T11:00:00Z"
  }
]
```

---

### Test Webhook

**Endpoint**: `POST /tenants/{tenantId}/webhooks/{webhookId}/test`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "event": "user.registered",
  "data": {
    "userId": "user-123",
    "email": "test@example.com"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "statusCode": 200,
  "responseTime": 142
}
```

---

### Get Webhook Deliveries

**Endpoint**: `GET /tenants/{tenantId}/webhooks/{webhookId}/deliveries`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `limit`: Number of deliveries (default: 50)
- `status`: Filter by status (success/failure)

**Response** (200 OK):
```json
{
  "deliveries": [
    {
      "id": "delivery-456",
      "event": "user.registered",
      "attempt": 1,
      "maxAttempts": 3,
      "responseStatus": 200,
      "deliveredAt": "2025-01-18T10:30:00Z",
      "createdAt": "2025-01-18T10:30:00Z"
    },
    {
      "id": "delivery-457",
      "event": "user.logged_in",
      "attempt": 2,
      "maxAttempts": 3,
      "responseStatus": 500,
      "nextRetryAt": "2025-01-18T10:35:00Z",
      "createdAt": "2025-01-18T10:30:00Z"
    }
  ],
  "total": 142
}
```

---

## Audit Logs

### List Audit Logs

**Endpoint**: `GET /tenants/{tenantId}/audit-logs`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `actorId`: Filter by user ID
- `action`: Filter by action (e.g., "user.logged_in")
- `resource`: Filter by resource type (e.g., "User")
- `status`: Filter by status (success/failure/pending)
- `startDate`: Start of date range (ISO 8601)
- `endDate`: End of date range (ISO 8601)
- `limit`: Items per page (default: 50)
- `offset`: Page offset (default: 0)

**Response** (200 OK):
```json
{
  "logs": [
    {
      "id": "log-123",
      "tenantId": "tenant-456",
      "actorId": "user-789",
      "actor": {
        "id": "user-789",
        "email": "alice@example.com"
      },
      "action": "user.logged_in",
      "resource": "User",
      "resourceId": "user-789",
      "metadata": {
        "ipAddress": "192.168.1.100"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "status": "success",
      "createdAt": "2025-01-18T10:30:00Z"
    }
  ],
  "total": 5420,
  "limit": 50,
  "offset": 0
}
```

---

### Get Audit Log Statistics

**Endpoint**: `GET /tenants/{tenantId}/audit-logs/stats`

**Headers**:
```
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `days`: Number of days to analyze (default: 30)

**Response** (200 OK):
```json
{
  "totalLogs": 5420,
  "byAction": {
    "user.logged_in": 2100,
    "user.logged_out": 1800,
    "user.registered": 150,
    "role.assigned": 45
  },
  "byStatus": {
    "success": 5200,
    "failure": 220
  },
  "byDate": {
    "2025-01-18": 180,
    "2025-01-17": 195,
    "2025-01-16": 170
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-01-18T11:00:00.123Z",
  "path": "/auth/signup"
}
```

### Common HTTP Status Codes

- **200 OK**: Successful GET request
- **201 Created**: Successful POST/PUT request
- **400 Bad Request**: Invalid input or validation error
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Validation Errors

Field-level validation errors:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

---

## Rate Limiting

API requests are rate-limited per tenant:

- Default: 100 requests per minute
- Configurable via TenantSettings
- Rate limit headers included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1610982000
```

When rate limit is exceeded:

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "ThrottlerException"
}
```

---

**API Version**: 1.0
**Last Updated**: 2025-01-18
