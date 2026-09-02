import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly calendarServicePublicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.calendarServicePublicUrl = this.configService.get<string>(
      'calendarServicePublicUrl',
    )!;
  }

  getGoogleLoginUrl(): string {
    // El BFF no maneja OAuth directamente: delega en el Google Calendar
    // Service, que sí posee el client secret y gestiona el intercambio de
    // tokens (ver arquitectura del documento de diseño). Esta URL la
    // sigue el NAVEGADOR del usuario (es una redirección HTTP), así que
    // debe ser la URL pública, no el nombre interno del contenedor.
    return `${this.calendarServicePublicUrl}/auth/google`;
  }
}
