import { IsArray, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  public name!: string;

  @IsOptional()
  @IsString()
  public emoji?: string;

  @IsOptional()
  @IsString()
  public color?: string;

  @IsOptional()
  @IsString()
  public imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public conversationIds?: string[];
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  public name?: string;

  @IsOptional()
  @IsString()
  public emoji?: string;

  @IsOptional()
  @IsString()
  public color?: string;

  @IsOptional()
  @IsString()
  public imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public conversationIds?: string[];

  @IsOptional()
  @IsNumber()
  public order?: number;
}
