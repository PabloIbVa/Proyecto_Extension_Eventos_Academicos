import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { AnalyzePageDto } from './dto/analyze-page.dto';

export interface AnalysisResult {
  title: string;
  startDateTime: string | null;
  endDateTime: string | null;
  location: string | null;
  description: string | null;
  confidence: number;
}

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('aiServiceUrl')!;
  }

  async analyzeContent(dto: AnalyzePageDto, request?: Request): Promise<AnalysisResult> {
    const abortController = new AbortController();
    const onClose = () => abortController.abort();

    request?.once('close', onClose);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<AnalysisResult>(
          `${this.aiServiceUrl}/analyze`,
          { text: dto.text, url: dto.url },
          {
            timeout: 15000,
            signal: abortController.signal,
          },
        ),
      );
      return data;
    } catch (error) {
      if (abortController.signal.aborted) {
        this.logger.warn('Análisis cancelado por el cliente.');
        throw new BadGatewayException('El analisis fue cancelado por el usuario.');
      }

      this.logger.error('Error al llamar al AI Processing Service', error as Error);
      throw new BadGatewayException(
        'No fue posible analizar el contenido en este momento. Intenta de nuevo más tarde.',
      );
    } finally {
      request?.off('close', onClose);
    }
  }
}
