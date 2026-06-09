import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export interface JwtPayload {
    sub: string;
    email: string;
    orgId: string;
    role: string;
}
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
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
    requestPasswordReset(email: string): Promise<{
        success: boolean;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
    verifyUser(payload: JwtPayload): Promise<{
        org: {
            id: string;
            isActive: boolean;
            name: string;
            slug: string;
            planTier: string;
        };
    } & {
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        orgId: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
        createdAt: Date;
        updatedAt: Date;
        passwordHash: string | null;
    }>;
    private slugify;
}
