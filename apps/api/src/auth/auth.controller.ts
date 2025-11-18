import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  LoginRequest,
  SignupRequest,
  MagicLinkRequest,
  RefreshTokenRequest,
} from '@universal-auth-idp/auth-core';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupRequest) {
    return this.authService.signup(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginRequest) {
    return this.authService.login(dto);
  }

  @Post('magic-link')
  async requestMagicLink(@Body() dto: MagicLinkRequest) {
    return this.authService.requestMagicLink(dto);
  }

  @Get('magic-link/verify')
  async verifyMagicLink(@Query('token') token: string) {
    return this.authService.verifyMagicLink(token);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const tenantSlug = req.query.state as string;
    const tokens = await this.authService.handleGoogleAuth(req.user, tenantSlug);

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.ADMIN_URL || 'http://localhost:3001'}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
    res.redirect(redirectUrl);
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenRequest) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return user;
  }
}
