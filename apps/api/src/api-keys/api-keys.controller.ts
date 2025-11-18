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
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto';

@Controller('tenants/:tenantId/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.create(tenantId, dto, user.userId);
  }

  @Get()
  async findAll(@Param('tenantId') tenantId: string) {
    return this.apiKeysService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.apiKeysService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.apiKeysService.update(id, dto);
  }

  @Post(':id/rotate')
  async rotate(@Param('id') id: string) {
    return this.apiKeysService.rotate(id);
  }

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    return this.apiKeysService.revoke(id);
  }

  @Post('verify')
  async verify(@Body('apiKey') apiKey: string) {
    return this.apiKeysService.verify(apiKey);
  }
}
