import { Member } from "../interfaces/member";

export type HttpResult = {
  success: boolean;
  message: string;
  data: Member | Member[] | any;
};