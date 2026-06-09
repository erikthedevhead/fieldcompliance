import { PrismaService } from '../prisma/prisma.service';
export declare class DeadlinesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(orgId: string, opts?: {
        status?: string;
        facilityId?: string;
    }): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
        assignedUser: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string;
        description: string | null;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    })[]>;
    upcoming(orgId: string, days: number): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
        assignedUser: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string;
        description: string | null;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    })[]>;
    overdue(orgId: string): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
        assignedUser: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string;
        description: string | null;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    })[]>;
    findById(id: string, orgId: string): Promise<{
        facility: {
            id: string;
            orgId: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import(".prisma/client").$Enums.FacilityType;
            state: string;
            apiWellNumber: string | null;
            county: string | null;
            latitude: import("@prisma/client-runtime-utils").Decimal | null;
            longitude: import("@prisma/client-runtime-utils").Decimal | null;
            legalDescription: string | null;
            commissionedAt: Date | null;
            operatorId: string | null;
            decommissionedAt: Date | null;
        };
        regulationVersion: {
            regulation: {
                id: string;
                isActive: boolean;
                description: string | null;
                title: string;
                code: string;
                jurisdiction: import(".prisma/client").$Enums.RegulationJurisdiction;
                cfrPart: string | null;
                federalRegisterUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            regulationId: string;
            version: string;
            effectiveDate: Date;
            expiresAt: Date | null;
            changeNotes: string | null;
            rawJsonSchema: import("@prisma/client/runtime/client").JsonValue;
        };
        assignedUser: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string;
        description: string | null;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    }>;
    complete(id: string, orgId: string, userId: string, notes?: string): Promise<{
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string;
        description: string | null;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    }>;
    assign(id: string, orgId: string, userId: string | null): Promise<{
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string;
        description: string | null;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    }>;
}
