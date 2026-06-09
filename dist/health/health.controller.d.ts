import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private prisma;
    constructor(prisma: PrismaService);
    check(): Promise<{
        status: string;
        uptime: number;
        timestamp: string;
        checks: {
            database: string;
        };
    }>;
}
