import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto, UpdateWebhookDto, TestWebhookDto } from './dto';
import { randomBytes, createHmac } from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateWebhookDto) {
    const secret = dto.secret || this.generateSecret();

    const webhook = await this.prisma.webhook.create({
      data: {
        tenantId,
        url: dto.url,
        events: dto.events,
        description: dto.description,
        secret,
        isActive: true,
      },
    });

    return this.mapToDto(webhook);
  }

  async findAll(tenantId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map(this.mapToDto);
  }

  async findOne(id: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return {
      ...this.mapToDto(webhook),
      recentDeliveries: webhook.deliveries.map(this.mapDeliveryToDto),
    };
  }

  async update(id: string, dto: UpdateWebhookDto) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const updated = await this.prisma.webhook.update({
      where: { id },
      data: {
        url: dto.url,
        events: dto.events,
        description: dto.description,
        isActive: dto.isActive,
      },
    });

    return this.mapToDto(updated);
  }

  async remove(id: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.webhook.delete({
      where: { id },
    });

    return { message: 'Webhook deleted successfully' };
  }

  async test(id: string, dto: TestWebhookDto) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const payload = dto.payload || { test: true, timestamp: new Date().toISOString() };

    const delivery = await this.deliver(webhook.id, dto.event, payload);

    return {
      success: delivery.deliveredAt !== null,
      delivery: this.mapDeliveryToDto(delivery),
    };
  }

  async getDeliveries(webhookId: string, limit: number = 50) {
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return deliveries.map(this.mapDeliveryToDto);
  }

  async triggerEvent(tenantId: string, event: string, payload: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    const deliveries = await Promise.allSettled(
      webhooks.map((webhook) => this.deliver(webhook.id, event, payload)),
    );

    return {
      event,
      webhooksTriggered: webhooks.length,
      deliveries: deliveries.map((result, index) => ({
        webhookId: webhooks[index].id,
        status: result.status,
        delivery: result.status === 'fulfilled' ? result.value : null,
      })),
    };
  }

  private async deliver(webhookId: string, event: string, payload: any) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        attempt: 1,
      },
    });

    try {
      const signature = this.generateSignature(payload, webhook.secret);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery-Id': delivery.id,
        },
        timeout: 10000,
      });

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000),
          deliveredAt: new Date(),
        },
      });

      return this.prisma.webhookDelivery.findUnique({
        where: { id: delivery.id },
      });
    } catch (error) {
      const responseStatus = error.response?.status || 500;
      const responseBody = error.response?.data
        ? JSON.stringify(error.response.data).substring(0, 1000)
        : error.message;

      // Schedule retry if not exhausted
      const nextRetryAt =
        delivery.attempt < delivery.maxAttempts
          ? new Date(Date.now() + Math.pow(2, delivery.attempt) * 60000) // Exponential backoff
          : null;

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          responseStatus,
          responseBody,
          failedAt: nextRetryAt ? null : new Date(),
          nextRetryAt,
        },
      });

      return this.prisma.webhookDelivery.findUnique({
        where: { id: delivery.id },
      });
    }
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  private mapToDto(webhook: any) {
    return {
      id: webhook.id,
      tenantId: webhook.tenantId,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  private mapDeliveryToDto(delivery: any) {
    return {
      id: delivery.id,
      webhookId: delivery.webhookId,
      event: delivery.event,
      attempt: delivery.attempt,
      maxAttempts: delivery.maxAttempts,
      responseStatus: delivery.responseStatus,
      deliveredAt: delivery.deliveredAt,
      failedAt: delivery.failedAt,
      nextRetryAt: delivery.nextRetryAt,
      createdAt: delivery.createdAt,
    };
  }
}
