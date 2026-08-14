import { IsString, MinLength, MaxLength } from 'class-validator'

export class AcceptInviteDto {
  @IsString()
  token: string

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string
}
