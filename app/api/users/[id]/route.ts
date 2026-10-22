
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'teacher', 'student', 'parent'] as const;
const STATUSES = ['active', 'inactive', 'banned'] as const;

type Context = { params: Promise<{ id: string }> };

async function authorize() {
  const session = await getSession();
  return session?.role === 'admin' ? session : null;
}

// PATCH /api/users/:id
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await authorize();

    if (!session) {
      return NextResponse.json({ message: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const current = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        status: true,
        email: true,
        student_profiles: { select: { grade_id: true } },
        teacher_profiles: { select: { user_id: true } },
        parent_profiles: { select: { user_id: true } },
      },
    });

    if (!current) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    // Không cho quản trị viên tự hạ quyền hoặc tự khóa tài khoản đang sử dụng.
    const changingOwnRole =
      id === session.userId && body.role && body.role !== 'admin';
    const changingOwnStatus =
      id === session.userId && body.status && body.status !== 'active';

    if (changingOwnRole || changingOwnStatus) {
      return NextResponse.json(
        { message: 'Bạn không thể tự hạ quyền hoặc tự khóa tài khoản của mình.' },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};

    if (body.full_name !== undefined) {
      if (typeof body.full_name !== 'string' || !body.full_name.trim()) {
        return NextResponse.json({ message: 'Họ tên không hợp lệ.' }, { status: 400 });
      }
      if (body.full_name.trim().length > 255) {
        return NextResponse.json({ message: 'Họ tên quá dài.' }, { status: 400 });
      }
      data.full_name = body.full_name.trim();
    }

    if (body.email !== undefined) {
      if (typeof body.email !== 'string' ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
        return NextResponse.json({ message: 'Email không hợp lệ.' }, { status: 400 });
      }

      data.email = body.email.trim().toLowerCase();
    }

    if (body.phone !== undefined) {
      if (body.phone !== null && typeof body.phone !== 'string') {
        return NextResponse.json({ message: 'Số điện thoại không hợp lệ.' }, { status: 400 });
      }
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      if (phone.length > 20) {
        return NextResponse.json({ message: 'Số điện thoại quá dài.' }, { status: 400 });
      }
      data.phone = phone || null;
    }

    if (body.role !== undefined) {
      if (!(ROLES as readonly string[]).includes(body.role)) {
        return NextResponse.json({ message: 'Vai trò không hợp lệ.' }, { status: 400 });
      }
      data.role = body.role;
    }

    if (body.status !== undefined) {
      if (!(STATUSES as readonly string[]).includes(body.status)) {
        return NextResponse.json({ message: 'Trạng thái không hợp lệ.' }, { status: 400 });
      }
      data.status = body.status;
    }

    if (body.password !== undefined && body.password !== '') {
      if (typeof body.password !== 'string' ||
          body.password.length < 8 || body.password.length > 72) {
        return NextResponse.json(
          { message: 'Mật khẩu mới phải có từ 8 đến 72 ký tự.' },
          { status: 400 },
        );
      }
      data.password_hash = await bcrypt.hash(body.password, 12);
    }

    data.updated_at = new Date();

    const nextRole = (data.role ?? current.role) as string;
    const gradeId =
      typeof body.grade_id === 'string' && body.grade_id.trim()
        ? body.grade_id.trim()
        : current.student_profiles?.grade_id;

    if (nextRole === 'student' && !gradeId) {
      return NextResponse.json(
        { message: 'Cần cung cấp khối lớp khi chuyển tài khoản sang học sinh.' },
        { status: 400 },
      );
    }

    const email = data.email as string | undefined;
    if (email) {
      const duplicate = await prisma.user.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json({ message: 'Email đã được sử dụng.' }, { status: 409 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (nextRole === 'student' && gradeId) {
        const grade = await tx.grades.findUnique({
          where: { id: gradeId },
          select: { id: true },
        });
        if (!grade) throw new Error('INVALID_GRADE_ID');
      }

      const user = await tx.user.update({
        where: { id },
        data: data as never,
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
      });

      // Tạo hồ sơ đích nếu chưa có; giữ nguyên các hồ sơ cũ và dữ liệu liên quan.
      if (nextRole === 'teacher' && !current.teacher_profiles) {
        await tx.teacher_profiles.create({ data: { user_id: id } });
      } else if (nextRole === 'parent' && !current.parent_profiles) {
        await tx.parent_profiles.create({ data: { user_id: id } });
      } else if (nextRole === 'student' && !current.student_profiles && gradeId) {
        await tx.student_profiles.create({
          data: { user_id: id, grade_id: gradeId },
        });
      } else if (nextRole === 'student' && current.student_profiles && body.grade_id) {
        await tx.student_profiles.update({
          where: { user_id: id },
          data: { grade_id: gradeId! },
        });
      }

      return user;
    });

    return NextResponse.json({ message: 'Cập nhật thành công.', user: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_GRADE_ID') {
      return NextResponse.json({ message: 'Khối lớp không tồn tại.' }, { status: 400 });
    }

    if (
      typeof error === 'object' && error !== null &&
      'code' in error && error.code === 'P2002'
    ) {
      return NextResponse.json({ message: 'Email đã được sử dụng.' }, { status: 409 });
    }

    console.error('PATCH /api/users/[id]:', error);
    return NextResponse.json({ message: 'Không thể cập nhật tài khoản.' }, { status: 500 });
  }
}

// DELETE /api/users/:id
// Xóa mềm: đổi trạng thái thành inactive, không xóa dữ liệu người dùng.
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const session = await authorize();

    if (!session) {
      return NextResponse.json({ message: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { id } = await context.params;

    if (id === session.userId) {
      return NextResponse.json(
        { message: 'Bạn không thể vô hiệu hóa tài khoản của chính mình.' },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'inactive', updated_at: new Date() },
    });

    return NextResponse.json({ message: 'Đã vô hiệu hóa tài khoản.' });
  } catch (error) {
    console.error('DELETE /api/users/[id]:', error);
    return NextResponse.json({ message: 'Không thể vô hiệu hóa tài khoản.' }, { status: 500 });
  }
}
