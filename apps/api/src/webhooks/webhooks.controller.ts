import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWebhookDto, UpdateWebhookDto, TestWebhookDto } from './dto';

@Controller('tenants/:tenantId/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(tenantId, dto);
  }

  @Get()
  async findAll(@Param('tenantId') tenantId: string) {
    return this.webhooksService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.webhooksService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.webhooksService.remove(id);
  }

  @Post(':id/test')
  async test(@Param('id') id: string, @Body() dto: TestWebhookDto) {
    return this.webhooksService.test(id, dto);
  }

  @Get(':id/deliveries')
  async getDeliveries(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.webhooksService.getDeliveries(id, limit ? parseInt(limit.toString()) : 50);
  }
}
