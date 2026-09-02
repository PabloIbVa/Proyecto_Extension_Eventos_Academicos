import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class EventStateDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string | null;

  @IsString()
  @IsOptional()
  startDateTime?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string | null;
}

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

export class ChatRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  message?: string;

  @ValidateNested()
  @Type(() => EventStateDto)
  currentEvent: EventStateDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsOptional()
  history?: ChatMessageDto[];

  @IsBoolean()
  @IsOptional()
  isGreeting?: boolean;
}
