// app/api/teachers/students/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    // 1. Kiểm tra đăng nhập
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // 2. Chỉ giáo viên mới được xem danh sách học sinh
    if (session.role !== 'teacher') {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    // 3. Lấy các lớp do giáo viên hiện tại phụ trách
    const classes = await prisma.classes.findMany({
      where: {
        teacher_id: session.userId,
      },
      select: {
        id: true,
        name: true,
        grade_id: true,
      },
    });

    const classIds = classes.map((item) => item.id);

    // Nếu giáo viên chưa có lớp
    if (classIds.length === 0) {
      return NextResponse.json({
        students: [],
      });
    }

    // 4. Lấy học sinh đang tham gia các lớp của giáo viên
    const enrollments = await prisma.class_enrollments.findMany({
      where: {
        class_id: {
          in: classIds,
        },
        status: 'active',
      },
      select: {
        student_id: true,
        class_id: true,
        joined_at: true,

        classes: {
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
        },

        student_profiles: {
          select: {
            user_id: true,
            grade_id: true,
            total_points: true,
            current_streak: true,
            longest_streak: true,

            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                phone: true,
                avatar_url: true,
              },
            },

            grades: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },

      orderBy: {
        joined_at: 'desc',
      },
    });

    // 5. Chuyển dữ liệu về dạng dễ dùng cho frontend
    const students = enrollments.map((enrollment) => {
      const student = enrollment.student_profiles;

      return {
        id: student.user_id,
        student_id: student.user_id,

        full_name: student.user.full_name,
        email: student.user.email,
        phone: student.user.phone,
        avatar_url: student.user.avatar_url,

        grade_id: student.grade_id,
        grade_name: student.grades?.name ?? null,

        total_points: student.total_points,
        current_streak: student.current_streak,
        longest_streak: student.longest_streak,

        class_id: enrollment.classes.id,
        class_name: enrollment.classes.name,

        joined_at: enrollment.joined_at,
      };
    });

    // 6. Loại học sinh trùng nếu một học sinh thuộc nhiều lớp
    const uniqueStudents = Array.from(
      new Map(
        students.map((student) => [
          `${student.student_id}-${student.class_id}`,
          student,
        ])
      ).values()
    );

    return NextResponse.json({
      students: uniqueStudents,
      total: uniqueStudents.length,
    });
  } catch (error) {
    console.error(
      'GET /api/teachers/students error:',
      error
    );

    return NextResponse.json(
      {
        message: 'Không thể tải danh sách học sinh',
      },
      { status: 500 }
    );
  }
}
