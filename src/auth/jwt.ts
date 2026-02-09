import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { JWTPayload, AuthenticatedUser } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}

export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return expiration < new Date();
}

export function createAuthenticatedUser(payload: JWTPayload, currentDatabase: string): AuthenticatedUser {
  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    databases: payload.databases,
    currentDatabase,
  };
}
