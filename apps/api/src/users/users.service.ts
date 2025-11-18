import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from '@universal-auth-idp/auth-core';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(this.mapToDto);
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToDto(user);
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.mapToDto(updated);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  private mapToDto(user: any): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.userRoles?.map((ur: any) => ({
        id: ur.role.id,
        tenantId: ur.role.tenantId,
        name: ur.role.name,
        description: ur.role.description,
        permissions: ur.role.rolePermissions?.map((rp: any) => ({
          id: rp.permission.id,
          tenantId: rp.permission.tenantId,
          key: rp.permission.key,
          description: rp.permission.description,
        })),
      })),
    };
  }
}
