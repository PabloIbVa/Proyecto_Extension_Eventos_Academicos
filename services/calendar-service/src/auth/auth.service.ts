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
      prompt: 'consent', // fuerza a Google a re-emitir refresh_token siempre
      scope: scopes,
    });
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
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
}
