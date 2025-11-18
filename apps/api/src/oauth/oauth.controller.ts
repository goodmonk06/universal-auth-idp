import { Controller, Post, Body } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { IntrospectRequest } from '@universal-auth-idp/auth-core';

@Controller('oauth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Post('introspect')
  async introspect(@Body() dto: IntrospectRequest) {
    return this.oauthService.introspect(dto);
  }
}
