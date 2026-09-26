
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // 1. Nhận dữ liệu từ form đăng ký
    const body = await request.json();

    const full_name = String(body.full_name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = body.phone
      ? String(body.phone).trim()
      : null;
    const password = String(body.password ?? '');
    const roleValue = String(body.role ?? '');

    // 2. Kiểm tra dữ liệu đầu vào
    if (!full_name || !email || !password || !roleValue) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Mật khẩu phải có ít nhất 8 ký tự' },
        { status: 400 }
      );
    }

    // 3. Chỉ cho phép đăng ký học sinh, giáo viên, phụ huynh
    const allowedRoles = [
      'student',
      'teacher',
      'parent',
    ] as const;

    if (
      !(allowedRoles as readonly string[]).includes(roleValue)
    ) {
      return NextResponse.json(
        { message: 'Vai trò không hợp lệ' },
        { status: 400 }
      );
    }

    const validatedRole =
      roleValue as (typeof allowedRoles)[number];

    // 4. Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email đã được đăng ký' },
        { status: 409 }
      );
    }

    // 5. Mã hóa mật khẩu
    const password_hash = await bcrypt.hash(password, 10);

    // 6. Tạo tài khoản trong PostgreSQL
    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        phone,
        password_hash,
        role: validatedRole,
        status: 'active',
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    // 7. Trả kết quả về frontend
    return NextResponse.json(
      {
        message: 'Đăng ký tài khoản thành công',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Lỗi đăng ký:', error);

    return NextResponse.json(
      { message: 'Đã xảy ra lỗi khi đăng ký tài khoản' },
      { status: 500 }
    );
  }
}