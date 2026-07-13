import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(32) nickname!: string;
  @IsEmail() email!: string;
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula.' })
  @Matches(/[a-z]/, { message: 'A senha deve conter pelo menos uma letra minúscula.' })
  @Matches(/[0-9]/, { message: 'A senha deve conter pelo menos um número.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'A senha deve conter pelo menos um caractere especial.' })
  password!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken!: string;
}

export class RecoverPasswordDto {
  @IsEmail() email!: string;
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty() token!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(32) nickname?: string;
  @IsOptional() @IsString() @MaxLength(240) bio?: string;
  @IsOptional() @IsString() @MaxLength(500) coverUrl?: string;
  @IsOptional() @IsString() @MaxLength(40) coverPosition?: string;
}

export class ChangePasswordDto {
  @IsString() @MinLength(8) currentPassword!: string;
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'A nova senha deve conter pelo menos uma letra maiúscula.' })
  @Matches(/[a-z]/, { message: 'A nova senha deve conter pelo menos uma letra minúscula.' })
  @Matches(/[0-9]/, { message: 'A nova senha deve conter pelo menos um número.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'A nova senha deve conter pelo menos um caractere especial.' })
  newPassword!: string;
}

export class ChangeEmailDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) currentPassword!: string;
}

export class LogoutDto {
  @IsOptional() @IsString() refreshToken?: string;
}

export class DeleteAccountDto {
  @IsString() @MinLength(8) currentPassword!: string;
  @IsString() @IsNotEmpty() confirmation!: string;
}
