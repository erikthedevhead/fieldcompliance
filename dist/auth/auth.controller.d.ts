import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            org: {
                id: string;
                name: string;
                slug: string;
                planTier: string;
            };
        };
    }>;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            org: {
                id: string;
                name: string;
                slug: string;
                planTier: string;
            };
        };
    }>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        success: boolean;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
}
