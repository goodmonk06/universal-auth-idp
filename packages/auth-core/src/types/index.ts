export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  roleKeys: string[];
  permissions: string[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface MagicLinkRequest {
  email: string;
  tenantSlug?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface IntrospectRequest {
  token: string;
  clientId?: string;
}

export interface IntrospectResponse {
  active: boolean;
  userId?: string;
  tenantId?: string;
  email?: string;
  roleKeys?: string[];
  permissions?: string[];
  exp?: number;
}

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface UserDto {
  id: string;
  tenantId: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  roles?: RoleDto[];
}

export interface RoleDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  permissions?: PermissionDto[];
}

export interface PermissionDto {
  id: string;
  tenantId: string;
  key: string;
  description?: string;
}

export interface ApplicationDto {
  id: string;
  tenantId: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  createdAt: Date;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
}

export interface UpdateTenantDto {
  name?: string;
  slug?: string;
}

export interface CreateApplicationDto {
  name: string;
  redirectUris: string[];
}

export interface UpdateApplicationDto {
  name?: string;
  redirectUris?: string[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface CreatePermissionDto {
  key: string;
  description?: string;
}

export interface UpdatePermissionDto {
  key?: string;
  description?: string;
}

export interface AssignRoleDto {
  userId: string;
  roleId: string;
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
  FACEBOOK = 'FACEBOOK',
}

export interface SocialAuthCallback {
  provider: AuthProvider;
  code: string;
  state?: string;
}
