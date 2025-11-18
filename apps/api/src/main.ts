import { NestFactory } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.ADMIN_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Enable global error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  console.log(`
    🚀 Universal Auth IDP API is running!

    📍 API URL: http://localhost:${port}/api
    📚 Endpoints:
       - POST   /api/auth/signup
       - POST   /api/auth/login
       - POST   /api/auth/magic-link
       - GET    /api/auth/magic-link/verify
       - GET    /api/auth/google
       - POST   /api/auth/refresh
       - POST   /api/auth/logout
       - GET    /api/auth/me
       - POST   /api/oauth/introspect
       - GET    /api/tenants
       - GET    /api/tenants/:tenantId/users
       - GET    /api/tenants/:tenantId/roles
       - GET    /api/tenants/:tenantId/permissions
       - GET    /api/tenants/:tenantId/applications
  `);
}

bootstrap();
