import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService, AuditLogFilters } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tenants/:tenantId/audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(@Param('tenantId') tenantId: string, @Query() filters: AuditLogFilters) {
    return this.auditLogsService.findAll(tenantId, filters);
  }

  @Get('stats')
  async getStats(@Param('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.auditLogsService.getStats(tenantId, days ? parseInt(days.toString()) : 30);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }
}
