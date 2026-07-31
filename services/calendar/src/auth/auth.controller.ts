import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('google')
  redirectToGoogle(@Res() res: Response) {
    const consentUrl = this.authService.getConsentUrl();
    res.redirect(consentUrl);
  }

  @Get('google/callback')
  async handleCallback(
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      this.logger.warn(`El usuario rechazó el consentimiento: ${error}`);
      return res.redirect(`/auth/success#error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect('/auth/success#error=missing_code');
    }

    try {
      const tokens = await this.authService.exchangeCodeForTokens(code);
      const email = this.authService.extractEmailFromIdToken(tokens.id_token);
      const fragment = new URLSearchParams({
        access_token: tokens.access_token ?? '',
        expires_in: String(tokens.expiry_date ?? ''),
        email: email ?? '',
      }).toString();
      return res.redirect(`/auth/success#${fragment}`);
    } catch {
      return res.redirect('/auth/success#error=token_exchange_failed');
    }
  }

  // Página propia del backend (NO chrome-extension://). El token viaja en
  // el fragmento de la URL, que nunca se envía al servidor. La extensión
  // vigila esta pestaña (chrome.tabs.onUpdated) y captura el token desde
  // ahí, en vez de que el backend intente redirigir directamente hacia la
  // extensión (Chromium bloquea ese tipo de redirección entre orígenes).
  @Get('success')
  renderSuccessPage(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="es">
  <head><meta charset="UTF-8" /><title>Sesión iniciada</title></head>
  <body style="font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
    <p>Sesión procesada. Puedes cerrar esta pestaña.</p>
  </body>
</html>`);
  }
}
