import { Controller, Post, Body } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { IntrospectDto } from '../auth/dto';

@Controller('oauth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Post('introspect')
  async introspect(@Body() dto: IntrospectDto) {
    return this.oauthService.introspect(dto);
  }
}
