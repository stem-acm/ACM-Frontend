import { Occupation } from '@/app/types/occupation';

export interface Member {
  registrationNumber?: number | null;
  firstName: string;
  lastName: string;
  title: string;
  gender: string;
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
