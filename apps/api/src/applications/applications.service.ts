import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  ApplicationDto,
} from '@universal-auth-idp/auth-core';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateApplicationDto,
  ): Promise<ApplicationDto & { clientSecret: string }> {
    // Generate client credentials
    const clientId = randomBytes(16).toString('hex');
    const clientSecret = randomBytes(32).toString('hex');
    const clientSecretHash = await bcrypt.hash(clientSecret, 10);

    const application = await this.prisma.application.create({
      data: {
        tenantId,
        name: dto.name,
        clientId,
        clientSecret: clientSecretHash,
        redirectUris: dto.redirectUris,
      },
    });

    return {
      ...this.mapToDto(application),
      clientSecret, // Return plain secret only on creation
    };
  }

  async findAll(tenantId: string): Promise<ApplicationDto[]> {
    const applications = await this.prisma.application.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return applications.map(this.mapToDto);
  }

  async findOne(id: string): Promise<ApplicationDto> {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.mapToDto(application);
  }

  async findByClientId(clientId: string): Promise<any> {
    const application = await this.prisma.application.findUnique({
      where: { clientId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async update(id: string, dto: UpdateApplicationDto): Promise<ApplicationDto> {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        name: dto.name,
        redirectUris: dto.redirectUris,
      },
    });

    return this.mapToDto(updated);
  }

  async regenerateSecret(id: string): Promise<{ clientSecret: string }> {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const clientSecret = randomBytes(32).toString('hex');
    const clientSecretHash = await bcrypt.hash(clientSecret, 10);

    await this.prisma.application.update({
      where: { id },
      data: { clientSecret: clientSecretHash },
    });

    return { clientSecret };
  }

  async remove(id: string): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    await this.prisma.application.delete({
      where: { id },
    });
  }

  async verifyClientCredentials(
    clientId: string,
    clientSecret: string,
  ): Promise<boolean> {
    const application = await this.findByClientId(clientId);
    return bcrypt.compare(clientSecret, application.clientSecret);
  }

  private mapToDto(application: any): ApplicationDto {
    return {
      id: application.id,
      tenantId: application.tenantId,
      name: application.name,
      clientId: application.clientId,
      redirectUris: application.redirectUris as string[],
      createdAt: application.createdAt,
    };
  }
}
