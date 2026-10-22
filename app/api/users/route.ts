
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'teacher', 'student', 'parent'] as const;
const STATUSES = ['active', 'inactive', 'banned'] as const;

async function isAdmin() {
  const session = await getSession();
  return session?.role === 'admin' ? session : null;
}

// GET /api/users?q=&role=&status=&page=&limit=
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập.' },
        { status: 403 },
      );
    }

    const params = request.nextUrl.searchParams;
    const q = (params.get('q') ?? '').trim();
    const role = params.get('role') ?? '';
    const status = params.get('status') ?? '';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(params.get('limit')) || 10),
    );

    if (role && !(ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ message: 'Vai trò không hợp lệ.' }, { status: 400 });
    }

    if (status && !(STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ message: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }

    const where = {
      ...(q
        ? {
            OR: [
              { full_name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(role ? { role: role as (typeof ROLES)[number] } : {}),
      ...(status ? { status: status as (typeof STATUSES)[number] } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          created_at: true,
          last_login_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/users:', error);
    return NextResponse.json(
      { message: 'Không thể tải danh sách người dùng.' },
      { status: 500 },
    );
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const session = await isAdmin();

    if (!session) {
      return NextResponse.json(
        { message: 'Bạn không có quyền thực hiện thao tác này.' },
        { status: 403 },
      );
    }

    const body = await request.json();

    const full_name =
      typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone =
      typeof body.phone === 'string' ? body.phone.trim() || null : null;
    const password =
      typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    const grade_id =
      typeof body.grade_id === 'string' ? body.grade_id.trim() : '';

    if (!full_name || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Vui lòng nhập họ tên, email, mật khẩu và vai trò.' },
        { status: 400 },
      );
    }

    if (full_name.length > 255 || email.length > 255 || (phone && phone.length > 20)) {
      return NextResponse.json(
        { message: 'Thông tin vượt quá độ dài cho phép.' },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Email không hợp lệ.' }, { status: 400 });
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { message: 'Mật khẩu phải có từ 8 đến 72 ký tự.' },
        { status: 400 },
      );
    }

    if (!(ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ message: 'Vai trò không hợp lệ.' }, { status: 400 });
    }

    if (role === 'student' && !grade_id) {
      return NextResponse.json(
        { message: 'Vui lòng cung cấp khối lớp cho học sinh.' },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json(
        { message: 'Email này đã được sử dụng.' },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      if (role === 'student') {
        const grade = await tx.grades.findUnique({
          where: { id: grade_id },
          select: { id: true },
        });

        if (!grade) {
          throw new Error('INVALID_GRADE_ID');
        }
      }

      const created = await tx.user.create({
        data: {
          full_name,
          email,
          phone,
          password_hash,
          role,
          status: 'active',
          updated_at: new Date(),
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

      if (role === 'teacher') {
        await tx.teacher_profiles.create({
          data: { user_id: created.id },
        });
      } else if (role === 'parent') {
        await tx.parent_profiles.create({
          data: { user_id: created.id },
        });
      } else if (role === 'student') {
        await tx.student_profiles.create({
          data: {
            user_id: created.id,
            grade_id,
          },
        });
      }

      return created;
    });

    return NextResponse.json(
      { message: 'Tạo tài khoản thành công.', user },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_GRADE_ID') {
      return NextResponse.json(
        { message: 'Khối lớp không tồn tại.' },
        { status: 400 },
      );
    }

    // Phòng trường hợp hai yêu cầu tạo cùng một email đồng thời.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { message: 'Email này đã được sử dụng.' },
        { status: 409 },
      );
    }

    console.error('POST /api/users:', error);
    return NextResponse.json(
      { message: 'Không thể tạo tài khoản.' },
      { status: 500 },
    );
  }
}
