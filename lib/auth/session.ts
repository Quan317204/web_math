import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in .env');
}

export type UserRole =
  | 'student'
  | 'teacher'
  | 'parent'
  | 'admin';

export interface SessionPayload {
  userId: string;
  role: UserRole;
}

export function createToken(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: '7d',
  });
}

export function verifyToken(
  token: string
): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!);

    if (
      typeof decoded === 'string' ||
      !decoded.userId ||
      !['student', 'teacher', 'parent', 'admin'].includes(
        decoded.role
      )
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}