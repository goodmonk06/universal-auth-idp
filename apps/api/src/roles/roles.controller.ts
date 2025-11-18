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
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
} from '@universal-auth-idp/auth-core';

@Controller('tenants/:tenantId/roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(tenantId, dto);
  }

  @Get()
  async findAll(@Param('tenantId') tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
    return { message: 'Role deleted successfully' };
  }

  @Post('assign')
  async assignRole(@Body() dto: AssignRoleDto) {
    await this.rolesService.assignRoleToUser(dto);
    return { message: 'Role assigned successfully' };
  }

  @Delete(':roleId/users/:userId')
  async removeRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    await this.rolesService.removeRoleFromUser(userId, roleId);
    return { message: 'Role removed successfully' };
  }
}
