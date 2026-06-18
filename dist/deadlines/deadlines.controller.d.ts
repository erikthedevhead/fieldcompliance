import { DeadlinesService } from './deadlines.service';
import { DeadlineGeneratorService } from './deadline-generator.service';
import { CompleteDeadlineDto } from './dto/complete-deadline.dto';
export declare class DeadlinesController {
    private deadlines;
    private generator;
    constructor(deadlines: DeadlinesService, generator: DeadlineGeneratorService);
    list(user: any, status?: string, facilityId?: string): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
        assignedUser: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orgId: string;
        facilityId: string;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        description: string | null;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    })[]>;
    upcoming(user: any, days?: string): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
        assignedUser: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orgId: string;
        facilityId: string;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        description: string | null;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    })[]>;
    overdue(user: any): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
        assignedUser: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orgId: string;
        facilityId: string;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        description: string | null;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    })[]>;
    generate(user: any): Promise<{
        created: number;
        message: string;
    }>;
    findOne(user: any, id: string): Promise<{
        facility: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            orgId: string;
            type: import(".prisma/client").$Enums.FacilityType;
            apiWellNumber: string | null;
            state: string;
            county: string | null;
            latitude: import("@prisma/client-runtime-utils").Decimal | null;
            longitude: import("@prisma/client-runtime-utils").Decimal | null;
            legalDescription: string | null;
            operatorId: string | null;
            commissionedAt: Date | null;
            decommissionedAt: Date | null;
        };
        regulationVersion: {
            regulation: {
                id: string;
                isActive: boolean;
                title: string;
                description: string | null;
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
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orgId: string;
        facilityId: string;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        description: string | null;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    }>;
    complete(user: any, id: string, dto: CompleteDeadlineDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orgId: string;
        facilityId: string;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        description: string | null;
        dueDate: Date;
        periodStart: Date | null;
        periodEnd: Date | null;
        status: import(".prisma/client").$Enums.DeadlineStatus;
        assignedUserId: string | null;
        completedAt: Date | null;
        completedBy: string | null;
        notes: string | null;
    }>;
    assign(user: any, id: string, body: {
        userId: string | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orgId: string;
        facilityId: string;
        regulationVersionId: string;
        ruleCode: string;
        title: string;
        description: string | null;
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
