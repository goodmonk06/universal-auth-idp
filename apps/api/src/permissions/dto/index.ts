import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z_]+:[a-z_]+$/, {
    message: 'Permission key must follow format "resource:action" (e.g., "users:read")',
  })
  key: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  @Matches(/^[a-z_]+:[a-z_]+$/, {
    message: 'Permission key must follow format "resource:action" (e.g., "users:read")',
  })
  key?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
