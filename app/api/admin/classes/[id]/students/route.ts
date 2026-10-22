import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    // 1. Kiểm tra đăng nhập và quyền quản trị viên
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập.' },
        { status: 401 },
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { message: 'Bạn không có quyền xem danh sách này.' },
        { status: 403 },
      );
    }

    // 2. Lấy ID lớp và từ khóa tìm kiếm
    const { id: classId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') ?? '').trim();

    if (!classId) {
      return NextResponse.json(
        { message: 'Thiếu mã lớp học.' },
        { status: 400 },
      );
    }

    // 3. Kiểm tra lớp học
    const classItem = await prisma.classes.findUnique({
      where: {
        id: classId,
      },
      select: {
        id: true,
        name: true,
        grade_id: true,
        grades: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!classItem) {
      return NextResponse.json(
        { message: 'Không tìm thấy lớp học.' },
        { status: 404 },
      );
    }

    // 4. Lấy các mã học sinh đang thuộc lớp
    const enrollments = await prisma.class_enrollments.findMany({
      where: {
        class_id: classId,
      },
      select: {
        student_id: true,
      },
    });

    const studentIds = [
      ...new Set(enrollments.map((item) => item.student_id)),
    ];

    // Lớp chưa có học sinh
    if (studentIds.length === 0) {
      return NextResponse.json({
        class: classItem,
        data: [],
        total: 0,
      });
    }

    // 5. Lấy hồ sơ học sinh và thông tin tài khoản
    // Không truy vấn avatar_url vì student_profiles không có trường này.
    const profiles = await prisma.student_profiles.findMany({
      where: {
        user_id: {
          in: studentIds,
        },
        ...(q
          ? {
              user: {
                OR: [
                  {
                    full_name: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                  {
                    email: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            }
          : {}),
      },
      select: {
        user_id: true,
        user: {
          select: {
            full_name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        user_id: 'asc',
      },
    });

    // 6. Trả dữ liệu về giao diện
    const data = profiles.map((profile) => ({
      id: profile.user_id,
      full_name: profile.user?.full_name ?? 'Chưa cập nhật',
      email: profile.user?.email ?? '',
      phone: profile.user?.phone ?? '',
    }));

    return NextResponse.json({
      class: classItem,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error(
      'GET /api/admin/classes/[id]/students:',
      error,
    );

    return NextResponse.json(
      {
        message: 'Không thể tải danh sách học sinh của lớp.',
      },
      { status: 500 },
    );
  }
}