// ==================== USER & AUTH RESPONSE ====================

export interface User {
  publicId: string;
  email: string;
  fullName: string;
  role: string;
  authProvider: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// ==================== AUTH REQUEST MODELS ====================

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface FacebookLoginRequest {
  accessToken: string;
}

export interface LinkEmailRequest {
  providerId: string;
  provider: string;
  email: string;
}

// ==================== JWT ====================

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}