declare const ROLES: readonly ["ORG_ADMIN", "EHS_COORDINATOR", "SITE_MANAGER", "FIELD_TECH", "AUDITOR"];
export declare class CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    role: (typeof ROLES)[number];
    phone?: string;
}
export {};
