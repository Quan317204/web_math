// app/api/teacher/classes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (session.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    const classes = await prisma.classes.findMany({
      where: {
        teacher_id: session.userId,
      },
      include: {
        grades: true,
        _count: {
          select: {
            class_enrollments: {
              where: {
                status: 'active',
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error('GET /api/teacher/classes error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Không thể tải danh sách lớp',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (session.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : '';

    const gradeId =
      typeof body.gradeId === 'string'
        ? body.gradeId
        : '';

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tên lớp không được để trống',
        },
        { status: 400 }
      );
    }

    if (!gradeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng chọn khối',
        },
        { status: 400 }
      );
    }

    const grade = await prisma.grades.findUnique({
      where: {
        id: gradeId,
      },
    });

    if (!grade) {
      return NextResponse.json(
        {
          success: false,
          error: 'Khối không tồn tại',
        },
        { status: 400 }
      );
    }

    const teacherProfile = await prisma.teacher_profiles.findUnique({
      where: {
        user_id: session.userId,
      },
    });

    if (!teacherProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tài khoản giáo viên chưa có hồ sơ giáo viên',
        },
        { status: 400 }
      );
    }

    const newClass = await prisma.classes.create({
      data: {
        name,
        grade_id: gradeId,
        teacher_id: session.userId,
      },
      include: {
        grades: true,
        _count: {
          select: {
            class_enrollments: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tạo lớp thành công',
        data: newClass,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/teacher/classes error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Không thể tạo lớp',
      },
      { status: 500 }
    );
  }
}