import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzePageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  text: string;

  @IsString()
  @IsOptional()
  url?: string;
}
