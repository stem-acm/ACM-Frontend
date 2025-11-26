export interface HttpResult<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
