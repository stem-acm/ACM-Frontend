import { Member } from "../interfaces/member";

export type HttpResult<T> = {
  success: boolean;
  message: string;
  data: T
};