import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateApplicationDto, UpdateApplicationDto } from './dto';

@Controller('tenants/:tenantId/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(tenantId, dto);
  }

  @Get()
  async findAll(@Param('tenantId') tenantId: string) {
    return this.applicationsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateApplicationDto) {
    return this.applicationsService.update(id, dto);
  }

  @Post(':id/regenerate-secret')
  async regenerateSecret(@Param('id') id: string) {
    return this.applicationsService.regenerateSecret(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.applicationsService.remove(id);
    return { message: 'Application deleted successfully' };
  }
}
