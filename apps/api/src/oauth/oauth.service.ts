import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IntrospectRequest, IntrospectResponse, JwtPayload } from '@universal-auth-idp/auth-core';

@Injectable()
export class OAuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async introspect(dto: IntrospectRequest): Promise<IntrospectResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Check if token is an access token (not refresh token)
      if (payload.type !== 'access') {
        return { active: false };
      }

      return {
        active: true,
        userId: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        roleKeys: payload.roleKeys,
        permissions: payload.permissions,
        exp: payload.exp,
      };
    } catch (error) {
      // Token is invalid or expired
      return { active: false };
    }
  }
}
