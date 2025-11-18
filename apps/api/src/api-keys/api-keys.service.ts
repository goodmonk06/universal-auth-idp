import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateApiKeyDto,
    createdById?: string,
  ): Promise<{ apiKey: any; plainKey: string }> {
    // Generate API key: idp_<random32>
    const randomPart = randomBytes(32).toString('hex');
    const plainKey = `idp_${randomPart}`;
    const prefix = `idp_${randomPart.substring(0, 8)}`;
    const keyHash = await bcrypt.hash(plainKey, 10);

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyHash,
        prefix,
        scopes: dto.scopes || [],
        expiresAt,
        createdById,
        isActive: true,
      },
    });

    return {
      apiKey: this.mapToDto(apiKey),
      plainKey, // Only returned on creation
    };
  }

  async findAll(tenantId: string) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(this.mapToDto);
  }

  async findOne(id: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return this.mapToDto(apiKey);
  }

  async update(id: string, dto: UpdateApiKeyDto) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: {
        name: dto.name,
        scopes: dto.scopes,
      },
    });

    return this.mapToDto(updated);
  }

  async revoke(id: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'API key revoked successfully' };
  }

  async rotate(id: string): Promise<{ apiKey: any; plainKey: string }> {
    const existingKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }

    // Generate new key
    const randomPart = randomBytes(32).toString('hex');
    const plainKey = `idp_${randomPart}`;
    const prefix = `idp_${randomPart.substring(0, 8)}`;
    const keyHash = await bcrypt.hash(plainKey, 10);

    // Update existing key
    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: {
        keyHash,
        prefix,
        lastUsedAt: null, // Reset usage
      },
    });

    return {
      apiKey: this.mapToDto(apiKey),
      plainKey,
    };
  }

  async verify(plainKey: string): Promise<any> {
    if (!plainKey.startsWith('idp_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const prefix = plainKey.substring(0, 12); // idp_<first8>

    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        prefix,
        isActive: true,
      },
    });

    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(plainKey, apiKey.keyHash);
      if (isValid) {
        // Check expiration
        if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
          throw new UnauthorizedException('API key has expired');
        }

        // Update last used
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          id: apiKey.id,
          tenantId: apiKey.tenantId,
          scopes: apiKey.scopes,
          name: apiKey.name,
        };
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  private mapToDto(apiKey: any) {
    return {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      name: apiKey.name,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    };
  }
}
