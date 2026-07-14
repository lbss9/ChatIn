import { IsEmail, IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGroupConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  public title!: string;
}

export class OpenDirectConversationDto {
  @IsMongoId()
  public targetUserId!: string;
}

export class AddContactByEmailDto {
  @IsEmail()
  public email!: string;
}
