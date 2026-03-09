import { IsOptional, IsString } from 'class-validator';

export class CreateAuthLinkDto {
  @IsString()
  userOpenId!: string;

  @IsOptional()
  @IsString()
  userLabel?: string;

  @IsOptional()
  @IsString()
  returnContext?: string;
}
