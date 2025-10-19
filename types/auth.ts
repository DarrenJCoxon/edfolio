export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface AuthResponse {
  data?: {
    id: string;
    email: string;
    name: string | null;
  };
  error?: string;
  message?: string;
  details?: unknown;
}

export interface AuthError {
  message: string;
  code?: string;
}
