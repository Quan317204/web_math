import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

type Params = {
  params: Promise<{
    id: string;
  }>;
};


// GET /api/teachers/classes/[id]
export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (session.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const classData =
      await prisma.classes.findFirst({
        where: {
          id,
          teacher_id: session.userId,
        },
        include: {
          grades: true,

          class_enrollments: {
            where: {
              status: 'active',
            },
            include: {
              student_profiles: {
                include: {
                  user: {
                    select: {
                      id: true,
                      full_name: true,
                      email: true,
                      phone: true,
                      avatar_url: true,
                    },
                  },
                },
              },
            },
          },

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
      });

    if (!classData) {
      return NextResponse.json(
        { error: 'Không tìm thấy lớp học' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: classData,
      class: classData,
    });
  } catch (error) {
    console.error(
      'GET /api/teachers/classes/[id]:',
      error
    );

    return NextResponse.json(
      {
        error: 'Không thể tải lớp học',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}


// PATCH /api/teachers/classes/[id]
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (session.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();

    const name = String(
      body.name || ''
    ).trim();

    const gradeId = String(
      body.grade_id || ''
    ).trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Tên lớp không được để trống' },
        { status: 400 }
      );
    }

    if (!gradeId) {
      return NextResponse.json(
        { error: 'Vui lòng chọn khối lớp' },
        { status: 400 }
      );
    }

    // Kiểm tra lớp thuộc giáo viên
    const existingClass =
      await prisma.classes.findFirst({
        where: {
          id,
          teacher_id: session.userId,
        },
        select: {
          id: true,
        },
      });

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Không tìm thấy lớp học' },
        { status: 404 }
      );
    }

    // Kiểm tra grade tồn tại
    const grade =
      await prisma.grades.findUnique({
        where: {
          id: gradeId,
        },
      });

    if (!grade) {
      return NextResponse.json(
        { error: 'Khối lớp không tồn tại' },
        { status: 400 }
      );
    }

    const updatedClass =
      await prisma.classes.update({
        where: {
          id,
        },
        data: {
          name,
          grade_id: gradeId,
        },
        include: {
          grades: true,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật lớp học thành công',
      data: updatedClass,
    });
  } catch (error) {
    console.error(
      'PATCH /api/teachers/classes/[id]:',
      error
    );

    return NextResponse.json(
      {
        error: 'Không thể cập nhật lớp học',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}


// DELETE /api/teachers/classes/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (session.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingClass =
      await prisma.classes.findFirst({
        where: {
          id,
          teacher_id: session.userId,
        },
        select: {
          id: true,
        },
      });

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Không tìm thấy lớp học' },
        { status: 404 }
      );
    }

    await prisma.classes.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa lớp học',
    });
  } catch (error) {
    console.error(
      'DELETE /api/teachers/classes/[id]:',
      error
    );

    return NextResponse.json(
      {
        error: 'Không thể xóa lớp học',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}