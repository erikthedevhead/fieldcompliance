import { OrganizationsService } from './organizations.service';
export declare class OrganizationsController {
    private orgs;
    constructor(orgs: OrganizationsService);
    getMine(user: any): Promise<{
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
    updateMine(user: any, data: {
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
