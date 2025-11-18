import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleDto,
  AssignRoleDto,
} from '@universal-auth-idp/auth-core';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRoleDto): Promise<RoleDto> {
    // Check if role name already exists in tenant
    const existing = await this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Role name already exists in this tenant');
    }

    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Assign permissions if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await Promise.all(
        dto.permissionIds.map((permissionId) =>
          this.prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId,
            },
          }),
        ),
      );
    }

    return this.findOne(role.id);
  }

  async findAll(tenantId: string): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return roles.map(this.mapToDto);
  }

  async findOne(id: string): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.mapToDto(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Update role
    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    // Update permissions if provided
    if (dto.permissionIds) {
      // Remove existing permissions
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      await Promise.all(
        dto.permissionIds.map((permissionId) =>
          this.prisma.rolePermission.create({
            data: {
              roleId: id,
              permissionId,
            },
          }),
        ),
      );
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.prisma.role.delete({
      where: { id },
    });
  }

  async assignRoleToUser(dto: AssignRoleDto): Promise<void> {
    // Check if role and user exist
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if role belongs to user's tenant
    if (role.tenantId !== user.tenantId) {
      throw new ConflictException('Role does not belong to user tenant');
    }

    // Assign role
    await this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
      },
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  private mapToDto(role: any): RoleDto {
    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions?.map((rp: any) => ({
        id: rp.permission.id,
        tenantId: rp.permission.tenantId,
        key: rp.permission.key,
        description: rp.permission.description,
      })),
    };
  }
}
