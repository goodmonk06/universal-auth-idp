import { IsNotEmpty, IsString, IsOptional, IsArray, IsUrl } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsNotEmpty()
  redirectUris: string[];
}

export class UpdateApplicationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  redirectUris?: string[];
}
