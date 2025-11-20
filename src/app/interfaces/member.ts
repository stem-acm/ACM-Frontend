import { Occupation } from '@/app/types/occupation';

export interface Member {
  id?: number;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  birthDate: Date | string;
  birthPlace: string;
  address: string;
  occupation: Occupation;
  phoneNumber: string;
  studyOrWorkPlace: string;
  joinDate: Date | string;
  profileImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
