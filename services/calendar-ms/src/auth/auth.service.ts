import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly configService: ConfigService) {}

  private buildOAuthClient() {
    const { clientId, clientSecret, redirectUri } =
      this.configService.get('google');
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getConsentUrl(): string {
    const oauth2Client = this.buildOAuthClient();
    const { scopes } = this.configService.get('google');
    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // permite recibir refresh_token
      // "select_account" obliga a Google a mostrar el selector de cuentas
      // en cada login (útil para cambiar de cuenta), y "consent" fuerza a
      // reemitir refresh_token siempre.
      prompt: 'select_account consent',
      scope: scopes,
    });
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    id_token?: string | null;
  }> {
    const oauth2Client = this.buildOAuthClient();
    try {
      const { tokens } = await oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      this.logger.error('Error al intercambiar el código de Google por tokens', error as Error);
      throw error;
    }
  }

  // Extrae el email del id_token (JWT) sin verificar la firma — solo se
  // usa para mostrarlo en la UI ("cuenta conectada"), nunca para
  // autorizar nada, así que no hace falta validarlo criptográficamente
  // aquí (Google ya lo emitió confiablemente en el intercambio anterior).
  extractEmailFromIdToken(idToken: string | null | undefined): string | null {
    if (!idToken) return null;
    try {
      const payloadBase64 = idToken.split('.')[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson) as { email?: string };
      return payload.email ?? null;
    } catch {
      return null;
    }
  }
}
