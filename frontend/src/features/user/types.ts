export type UserRole = "ADMIN" | "ADVISOR" | "VIEWER";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ResetPasswordPayload {
  newPassword: string;
}

export interface UserManagementState {
  users: ManagedUser[];
  currentUser: ManagedUser | null;
  isLoading: boolean;
  error: string | null;
}

export interface UsersApiResponse {
  status: string;
  results: number;
  data: { users: ManagedUser[] };
}

export interface UserApiResponse {
  status: string;
  data: { user: ManagedUser };
}
