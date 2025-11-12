export type HttpResult<T> = {
  success: boolean;
  message: string;
  data: T
};