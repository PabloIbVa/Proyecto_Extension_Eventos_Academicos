import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ChatRequestDto } from './dto/chat-request.dto';

export interface ChatResult {
  reply: string;
  event: {
    title: string | null;
    startDateTime: string | null;
    location: string | null;
    description: string | null;
  };
  missingFields: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('aiServiceUrl')!;
  }

  async sendMessage(dto: ChatRequestDto): Promise<ChatResult> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ChatResult>(`${this.aiServiceUrl}/chat`, dto, {
          timeout: 15000,
        }),
      );
      return data;
    } catch (error) {
      this.logger.error('Error al llamar al chat del AI Processing Service', error as Error);
      throw new BadGatewayException(
        'No fue posible continuar la conversación con el asistente en este momento.',
      );
    }
  }
}
