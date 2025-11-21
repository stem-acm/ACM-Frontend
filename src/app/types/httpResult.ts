export interface HttpResult<T> {
  success: boolean;
  message: string;
  data: T;
}
