import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionDto,
} from '@universal-auth-idp/auth-core';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePermissionDto): Promise<PermissionDto> {
    // Check if permission key already exists in tenant
    const existing = await this.prisma.permission.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: dto.key,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Permission key already exists in this tenant');
    }

    const permission = await this.prisma.permission.create({
      data: {
        tenantId,
        key: dto.key,
        description: dto.description,
      },
    });

    return this.mapToDto(permission);
  }

  async findAll(tenantId: string): Promise<PermissionDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });

    return permissions.map(this.mapToDto);
  }

  async findOne(id: string): Promise<PermissionDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return this.mapToDto(permission);
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<PermissionDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const updated = await this.prisma.permission.update({
      where: { id },
      data: dto,
    });

    return this.mapToDto(updated);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.prisma.permission.delete({
      where: { id },
    });
  }

  private mapToDto(permission: any): PermissionDto {
    return {
      id: permission.id,
      tenantId: permission.tenantId,
      key: permission.key,
      description: permission.description,
    };
  }
}
