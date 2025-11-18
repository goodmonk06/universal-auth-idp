import { Injectable } from '@nestjs/common';

export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  ipAddress?: string;
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

@Injectable()
export class Logger {
  private context: LogContext = {};

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any, data?: any): void {
    this.log(LogLevel.ERROR, message, {
      ...data,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    });
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      ...(data && { data }),
    };

    // In production, this would go to a structured logging service
    // For now, we use console with formatting
    const prefix = this.getLevelPrefix(level);
    console.log(`${prefix} [${logEntry.timestamp}] ${message}`, {
      ...logEntry.context,
      ...(data && { data }),
    });
  }

  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
    }
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }
}

// Global logger instance
export const logger = new Logger();
