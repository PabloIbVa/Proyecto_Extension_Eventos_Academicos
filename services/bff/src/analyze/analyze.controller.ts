import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AnalyzePageDto } from './dto/analyze-page.dto';
import { AnalyzeService, AnalysisResult } from './analyze.service';

@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async analyze(@Body() dto: AnalyzePageDto): Promise<AnalysisResult> {
    return this.analyzeService.analyzeContent(dto);
  }
}
