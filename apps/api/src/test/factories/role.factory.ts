import { Role, Permission } from '@prisma/client';

export interface RoleFactoryOptions {
  tenantId?: string;
  name?: string;
  description?: string;
}

export interface PermissionFactoryOptions {
  tenantId?: string;
  key?: string;
  description?: string;
}

export class RoleFactory {
  static build(options: RoleFactoryOptions = {}): Partial<Role> {
    return {
      tenantId: options.tenantId || 'tenant-id',
      name: options.name || `Role ${Math.floor(Math.random() * 10000)}`,
      description: options.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static buildAdmin(tenantId: string): Partial<Role> {
    return this.build({
      tenantId,
      name: 'Admin',
      description: 'Full system access',
    });
  }

  static buildEditor(tenantId: string): Partial<Role> {
    return this.build({
      tenantId,
      name: 'Editor',
      description: 'Can edit content',
    });
  }

  static buildViewer(tenantId: string): Partial<Role> {
    return this.build({
      tenantId,
      name: 'Viewer',
      description: 'Read-only access',
    });
  }
}

export class PermissionFactory {
  static build(options: PermissionFactoryOptions = {}): Partial<Permission> {
    return {
      tenantId: options.tenantId || 'tenant-id',
      key: options.key || `permission:${Math.floor(Math.random() * 10000)}`,
      description: options.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static buildSet(tenantId: string, resource: string): Partial<Permission>[] {
    const actions = ['read', 'write', 'delete'];
    return actions.map(action => this.build({
      tenantId,
      key: `${resource}:${action}`,
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
    }));
  }
}
