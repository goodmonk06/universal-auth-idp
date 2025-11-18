import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantDto,
} from '@universal-auth-idp/auth-core';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTenantDto): Promise<TenantDto> {
    // Check if slug is already taken
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Tenant slug already exists');
    }

    const tenant = await this.prisma.tenant.create({
      data: dto,
    });

    return this.mapToDto(tenant);
  }

  async findAll(): Promise<TenantDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map(this.mapToDto);
  }

  async findOne(id: string): Promise<TenantDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapToDto(tenant);
  }

  async findBySlug(slug: string): Promise<TenantDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapToDto(tenant);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantDto> {
    // Check if tenant exists
    const existing = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    // If updating slug, check if new slug is already taken
    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new ConflictException('Tenant slug already exists');
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto,
    });

    return this.mapToDto(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.tenant.delete({
      where: { id },
    });
  }

  private mapToDto(tenant: any): TenantDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt,
    };
  }
}
