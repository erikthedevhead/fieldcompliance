import { PrismaService } from '../prisma/prisma.service';
export declare class DeadlineGeneratorService {
    private prisma;
    private readonly logger;
    private readonly LOOKAHEAD_DAYS;
    private readonly ACTIONABLE_TYPES;
    constructor(prisma: PrismaService);
    runDailyGeneration(): Promise<{
        orgsProcessed: number;
        created: number;
    }>;
    generateForOrg(orgId: string): Promise<number>;
    private computeNextDueDate;
    private addDays;
}
