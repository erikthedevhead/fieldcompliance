import { PrismaService } from '../prisma/prisma.service';
export declare class OrganizationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
        _count: {
            users: number;
            facilities: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        dotNumber: string | null;
        epaReporterCode: string | null;
        taxId: string | null;
        billingEmail: string;
        planTier: string;
        maxFacilities: number;
        trialEndsAt: Date | null;
        subscriptionId: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        billingEmail?: string;
    }): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        dotNumber: string | null;
        epaReporterCode: string | null;
        taxId: string | null;
        billingEmail: string;
        planTier: string;
        maxFacilities: number;
        trialEndsAt: Date | null;
        subscriptionId: string | null;
    }>;
}
