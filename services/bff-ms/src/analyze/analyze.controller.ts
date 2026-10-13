import { Body, Controller, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyzePageDto } from './dto/analyze-page.dto';
import { AnalyzeService, AnalysisResult } from './analyze.service';

@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async analyze(@Body() dto: AnalyzePageDto, @Req() req: Request): Promise<AnalysisResult> {
    return this.analyzeService.analyzeContent(dto, req);
  }
}
