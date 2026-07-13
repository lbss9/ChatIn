import { IsEmail, IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGroupConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title!: string;
}

export class OpenDirectConversationDto {
  @IsMongoId()
  targetUserId!: string;
}

export class AddContactByEmailDto {
  @IsEmail()
  email!: string;
}
