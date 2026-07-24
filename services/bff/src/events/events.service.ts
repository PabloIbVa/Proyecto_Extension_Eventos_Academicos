import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateEventDto } from './dto/create-event.dto';

export interface CreatedEvent {
  id: string;
  htmlLink: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly calendarServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.calendarServiceUrl = this.configService.get<string>(
      'calendarServiceUrl',
    )!;
  }

  async createEvent(
    dto: CreateEventDto,
    userAccessToken: string,
  ): Promise<CreatedEvent> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<CreatedEvent>(
          `${this.calendarServiceUrl}/events`,
          dto,
          {
            headers: { Authorization: `Bearer ${userAccessToken}` },
            timeout: 15000,
          },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error('Error al llamar al Google Calendar Service', error as Error);
      throw new BadGatewayException(
        'No fue posible crear el evento en Google Calendar en este momento.',
      );
    }
  }
}
