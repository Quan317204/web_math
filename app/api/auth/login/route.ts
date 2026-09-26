
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createToken } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Vui lòng nhập email và mật khẩu.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Email hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Email hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { message: 'Tài khoản đã bị khóa hoặc không hoạt động.' },
        { status: 403 }
      );
    }

    const validRoles = [
      'student',
      'teacher',
      'parent',
      'admin',
    ];

    if (!validRoles.includes(user.role)) {
      return NextResponse.json(
        { message: 'Vai trò tài khoản không hợp lệ.' },
        { status: 403 }
      );
    }

    const token = createToken({
      userId: user.id,
      role: user.role as
        | 'student'
        | 'teacher'
        | 'parent'
        | 'admin',
    });

    const response = NextResponse.json({
      message: 'Đăng nhập thành công.',
      userId: user.id,
      role: user.role,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { message: 'Lỗi máy chủ khi đăng nhập.' },
      { status: 500 }
    );
  }
}