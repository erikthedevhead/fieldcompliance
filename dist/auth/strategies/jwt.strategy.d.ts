import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private auth;
    constructor(config: ConfigService, auth: AuthService);
    validate(payload: JwtPayload): Promise<{
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
}
export {};
