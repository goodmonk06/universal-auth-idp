import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  tenantId: string;
  actorId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'pending';
  errorMessage?: string;
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  resource?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAuditLogDto) {
    const auditLog = await this.prisma.auditLog.create({
      data: dto,
    });

    return this.mapToDto(auditLog);
  }

  async findAll(tenantId: string, filters: AuditLogFilters = {}) {
    const where: any = { tenantId };

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(this.mapToDto),
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return log ? this.mapToDto(log) : null;
  }

  async getStats(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        action: true,
        status: true,
        createdAt: true,
      },
    });

    const byAction: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    logs.forEach((log) => {
      // By action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // By status
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;

      // By date
      const dateKey = log.createdAt.toISOString().split('T')[0];
      byDate[dateKey] = (byDate[dateKey] || 0) + 1;
    });

    return {
      totalLogs: logs.length,
      byAction,
      byStatus,
      byDate,
    };
  }

  private mapToDto(log: any) {
    return {
      id: log.id,
      tenantId: log.tenantId,
      actorId: log.actorId,
      actor: log.actor,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      status: log.status,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt,
    };
  }
}
