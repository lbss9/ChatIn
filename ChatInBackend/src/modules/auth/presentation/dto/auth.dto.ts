import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(100) public name!: string;
  @IsString() @IsNotEmpty() @MaxLength(32) public nickname!: string;
  @IsEmail() public email!: string;
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula.' })
  @Matches(/[a-z]/, { message: 'A senha deve conter pelo menos uma letra minúscula.' })
  @Matches(/[0-9]/, { message: 'A senha deve conter pelo menos um número.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'A senha deve conter pelo menos um caractere especial.' })
  public password!: string;
}

export class LoginDto {
  @IsEmail() public email!: string;
  @IsString() @MinLength(8) public password!: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() public refreshToken!: string;
}

export class RecoverPasswordDto {
  @IsEmail() public email!: string;
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty() public token!: string;
  @IsString() @MinLength(8) @MaxLength(128) public password!: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) public name?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(32) public nickname?: string;
  @IsOptional() @IsString() @MaxLength(240) public bio?: string;
  @IsOptional() @IsString() @MaxLength(500) public coverUrl?: string;
  @IsOptional() @IsString() @MaxLength(40) public coverPosition?: string;
}

export class ChangePasswordDto {
  @IsString() @MinLength(8) public currentPassword!: string;
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'A nova senha deve conter pelo menos uma letra maiúscula.' })
  @Matches(/[a-z]/, { message: 'A nova senha deve conter pelo menos uma letra minúscula.' })
  @Matches(/[0-9]/, { message: 'A nova senha deve conter pelo menos um número.' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'A nova senha deve conter pelo menos um caractere especial.',
  })
  public newPassword!: string;
}

export class ChangeEmailDto {
  @IsEmail() public email!: string;
  @IsString() @MinLength(8) public currentPassword!: string;
}

export class LogoutDto {
  @IsOptional() @IsString() public refreshToken?: string;
}

export class DeleteAccountDto {
  @IsString() @MinLength(8) public currentPassword!: string;
  @IsString() @IsNotEmpty() public confirmation!: string;
}
