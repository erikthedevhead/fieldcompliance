import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  orgName: string
}
