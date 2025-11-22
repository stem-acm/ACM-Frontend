import { Member } from "./member";

export interface Volunteer {
    id?: number;
    joinDate?: Date | null, 
    expirationDate?: Date | null, 
    createdBy: number,
    memberId: number,
    Member?: Member,
    createdAt?: Date;
    updatedAt?: Date;
}
