import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsISO8601()
  startDateTime: string;

  @IsISO8601()
  @IsOptional()
  endDateTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string;

  // IANA timezone, ej. "America/Mexico_City". Si no se envía, se usa un
  // default razonable en events.service.ts.
  @IsString()
  @IsOptional()
  @MaxLength(100)
  timeZone?: string;
}
