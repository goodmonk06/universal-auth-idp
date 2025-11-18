import { Injectable } from '@nestjs/common';
import { DomainEvent } from './domain-events';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

@Injectable()
export class EventEmitterService {
  private handlers: Map<string, EventHandler[]> = new Map();

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existingHandlers = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, [...existingHandlers, handler as EventHandler]);
  }

  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    console.log(`[Event] Emitting ${event.type}:`, {
      tenantId: event.tenantId,
      timestamp: event.timestamp,
    });

    await Promise.allSettled(handlers.map((handler) => handler(event)));
  }

  // Convenience method to emit multiple events
  async emitAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.emit(event)));
  }

  // Remove all handlers for an event type
  off(eventType: string): void {
    this.handlers.delete(eventType);
  }

  // Get registered event types
  getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
