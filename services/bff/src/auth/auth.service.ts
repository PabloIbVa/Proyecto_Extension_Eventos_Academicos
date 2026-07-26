import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly calendarServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.calendarServiceUrl = this.configService.get<string>(
      'calendarServiceUrl',
    )!;
  }

  getGoogleLoginUrl(): string {
    // El BFF no maneja OAuth directamente: delega en el Google Calendar
    // Service, que sí posee el client secret y gestiona el intercambio de
    // tokens (ver arquitectura del documento de diseño).
    return `${this.calendarServiceUrl}/auth/google`;
  }
}
