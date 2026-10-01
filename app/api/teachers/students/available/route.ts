import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

export async function GET() {
  try {
    await requireRole('teacher');

    const students = await prisma.student_profiles.findMany({
      where: {
        user: {
          role: 'student',
          status: 'active',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            avatar_url: true,
            status: true,
          },
        },
        grades: {
          select: {
            id: true,
            name: true,
            level_order: true,
          },
        },
      },
      orderBy: {
        user: {
          full_name: 'asc',
        },
      },
    });

    const data = students.map((student) => ({
      user_id: student.user.id,
      full_name: student.user.full_name,
      email: student.user.email,
      phone: student.user.phone,
      avatar_url: student.user.avatar_url,
      grade_id: student.grade_id,
      grade_name: student.grades?.name ?? null,
      level_order: student.grades?.level_order ?? null,
    }));

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error('GET /api/teachers/students/available error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải danh sách học sinh',
      },
      { status: 500 },
    );
  }
}
