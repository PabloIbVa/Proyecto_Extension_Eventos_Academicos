import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  redirectToGoogleLogin(@Res() res: Response) {
    res.redirect(this.authService.getGoogleLoginUrl());
  }
}
