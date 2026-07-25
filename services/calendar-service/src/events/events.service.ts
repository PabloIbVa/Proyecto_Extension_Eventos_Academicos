import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { CreateEventDto } from './dto/create-event.dto';

export interface CreatedEvent {
  id: string;
  htmlLink: string;
}

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

  async createEvent(
    dto: CreateEventDto,
    accessToken: string,
  ): Promise<CreatedEvent> {
    const calendar = this.buildCalendarClient(accessToken);

    // Si no se especifica hora de fin, se asume 1 hora de duración.
    const start = new Date(dto.startDateTime);
    const end = dto.endDateTime
      ? new Date(dto.endDateTime)
      : new Date(start.getTime() + 60 * 60 * 1000);

    try {
      const { data } = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: dto.title,
          description: dto.description,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
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
