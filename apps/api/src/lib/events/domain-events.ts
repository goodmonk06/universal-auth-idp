export interface DomainEvent {
  type: string;
  timestamp: Date;
  tenantId: string;
  data: any;
}

export class UserRegisteredEvent implements DomainEvent {
  readonly type = 'user.registered';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      userId: string;
      email: string;
    },
  ) {}
}

export class UserLoggedInEvent implements DomainEvent {
  readonly type = 'user.logged_in';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      userId: string;
      email: string;
      ipAddress?: string;
    },
  ) {}
}

export class UserLoggedOutEvent implements DomainEvent {
  readonly type = 'user.logged_out';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      userId: string;
      email: string;
    },
  ) {}
}

export class RoleAssignedEvent implements DomainEvent {
  readonly type = 'role.assigned';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      userId: string;
      roleId: string;
      roleName: string;
      assignedBy?: string;
    },
  ) {}
}

export class PermissionGrantedEvent implements DomainEvent {
  readonly type = 'permission.granted';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      roleId: string;
      permissionId: string;
      permissionKey: string;
    },
  ) {}
}

export class ApplicationCreatedEvent implements DomainEvent {
  readonly type = 'application.created';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      applicationId: string;
      name: string;
      clientId: string;
    },
  ) {}
}

export class ApiKeyCreatedEvent implements DomainEvent {
  readonly type = 'api_key.created';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      apiKeyId: string;
      name: string;
      scopes: string[];
      createdBy?: string;
    },
  ) {}
}

export class ApiKeyRevokedEvent implements DomainEvent {
  readonly type = 'api_key.revoked';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      apiKeyId: string;
      name: string;
    },
  ) {}
}

export class TenantCreatedEvent implements DomainEvent {
  readonly type = 'tenant.created';
  readonly timestamp = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly data: {
      name: string;
      slug: string;
    },
  ) {}
}
