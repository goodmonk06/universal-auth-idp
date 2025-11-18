import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsUrl,
  IsBoolean,
} from 'class-validator';

export class CreateWebhookDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  events: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  secret?: string;
}

export class UpdateWebhookDto {
  @IsUrl()
  @IsOptional()
  url?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  events?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TestWebhookDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsOptional()
  payload?: any;
}
