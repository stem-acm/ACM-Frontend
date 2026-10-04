export interface User {
  createdAt: string;
  email: string;
  id: number;
  updatedAt: string;
  username: string;
  role: 'admin' | 'intern' | 'volunteer';
  active: boolean;
  permissions: Record<string, boolean>;
}
