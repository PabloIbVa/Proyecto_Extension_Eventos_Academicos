import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { CreateEventDto } from './dto/create-event.dto';

export interface CreatedEvent {
  id: string;
  htmlLink: string;
}

const DEFAULT_TIMEZONE = 'America/Mexico_City';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly configService: ConfigService) {}

  private buildCalendarClient(accessToken: string) {
    const { clientId, clientSecret, redirectUri } =
      this.configService.get('google');
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  // Suma minutos a un datetime "naive" (sin zona horaria, ej.
  // "2026-07-30T10:00:00") tratando los componentes como aritmética de
  // reloj de pared, SIN pasar por la zona horaria del servidor. Esto es
  // clave: si usáramos `new Date(dto.startDateTime)` directamente, Node
  // interpretaría esa hora como si fuera la zona horaria de la máquina
  // donde corre el servicio, no la del usuario — produciendo horas
  // incorrectas en el evento creado.
  private addMinutesToNaiveDateTime(naiveDateTime: string, minutesToAdd: number): string {
    const match = naiveDateTime.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
    );
    if (!match) {
      throw new Error(`Formato de fecha/hora inválido: ${naiveDateTime}`);
    }
    const [, year, month, day, hour, minute, second] = match;
    const asUtcMillis = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? '0'),
    );
    const shifted = new Date(asUtcMillis + minutesToAdd * 60_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
      `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
    );
  }

  async createEvent(
    dto: CreateEventDto,
    accessToken: string,
  ): Promise<CreatedEvent> {
    const calendar = this.buildCalendarClient(accessToken);
    const timeZone = dto.timeZone || DEFAULT_TIMEZONE;

    // dto.startDateTime/endDateTime se tratan como hora "naive" (sin
    // offset) que representa la hora local en `timeZone`. Google Calendar
    // interpreta correctamente dateTime + timeZone juntos, sin que
    // nosotros hagamos ninguna conversión manual a UTC.
    const startDateTime = dto.startDateTime;
    const endDateTime =
      dto.endDateTime ?? this.addMinutesToNaiveDateTime(dto.startDateTime, 60);

    try {
      const { data } = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: dto.title,
          description: dto.description,
          location: dto.location,
          start: { dateTime: startDateTime, timeZone },
          end: { dateTime: endDateTime, timeZone },
        },
      });

      return {
        id: data.id ?? '',
        htmlLink: data.htmlLink ?? '',
      };
    } catch (error) {
      this.logger.error('Error al crear el evento en Google Calendar', error as Error);
      throw new BadGatewayException(
        'Google Calendar rechazó la creación del evento. Verifica que el token de acceso sea válido.',
      );
    }
  }
}
