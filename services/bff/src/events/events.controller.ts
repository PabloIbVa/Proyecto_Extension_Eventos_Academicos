import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { CreatedEvent, EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(
    @Body() dto: CreateEventDto,
    @Headers('authorization') authorization?: string,
  ): Promise<CreatedEvent> {
    const token = authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException(
        'Falta el token de acceso. Inicia sesión con Google primero.',
      );
    }
    return this.eventsService.createEvent(dto, token);
  }
}
