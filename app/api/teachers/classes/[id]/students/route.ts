import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// ============================================================
// GET: Lấy danh sách học sinh đang thuộc lớp
// ============================================================

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

    const { id: classId } = await params;

    // Kiểm tra lớp thuộc giáo viên hiện tại
    const classData = await prisma.classes.findFirst({
      where: {
        id: classId,
        teacher_id: session.userId,
      },
      select: {
        id: true,
        name: true,
        grade_id: true,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Không tìm thấy lớp học' },
        { status: 404 }
      );
    }

    const enrollments =
      await prisma.class_enrollments.findMany({
        where: {
          class_id: classId,
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
              grades: {
                select: {
                  id: true,
                  name: true,
                  level_order: true,
                },
              },
            },
          },
        },
        orderBy: {
          joined_at: 'desc',
        },
      });

    const students = enrollments.map(
      (enrollment) => ({
        id: enrollment.id,
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        status: enrollment.status,
        joined_at: enrollment.joined_at,

        student_profiles: {
          user_id:
            enrollment.student_profiles.user.id,

          full_name:
            enrollment.student_profiles.user.full_name,

          email:
            enrollment.student_profiles.user.email,

          phone:
            enrollment.student_profiles.user.phone,

          avatar_url:
            enrollment.student_profiles.user.avatar_url,

          grade_id:
            enrollment.student_profiles.grade_id,

          grade_name:
            enrollment.student_profiles.grades?.name ??
            null,
        },
      })
    );

    return NextResponse.json({
      success: true,
      data: students,
      students,
      total: students.length,
    });
  } catch (error) {
    console.error(
      'GET /api/teachers/classes/[id]/students:',
      error
    );

    return NextResponse.json(
      {
        error: 'Không thể tải danh sách học sinh',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST: Thêm MỘT HOẶC NHIỀU học sinh vào lớp
//
// Hỗ trợ cả:
//
// Cách cũ:
// {
//   "studentId": "uuid"
// }
//
// Cách mới:
// {
//   "studentIds": ["uuid1", "uuid2", "uuid3"]
// }
// ============================================================

export async function POST(
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

    const { id: classId } = await params;

    const body = await request.json();

    // ========================================================
    // NHẬN studentIds
    // ========================================================

    let studentIds: string[] = [];

    // Cách mới: studentIds[]
    if (Array.isArray(body.studentIds)) {
      studentIds = body.studentIds
        .map((id: unknown) =>
          String(id || '').trim()
        )
        .filter(Boolean);
    }

    // Cách cũ: studentId
    else if (body.studentId) {
      const studentId = String(
        body.studentId
      ).trim();

      if (studentId) {
        studentIds = [studentId];
      }
    }

    // Loại ID trùng
    studentIds = [...new Set(studentIds)];

    if (studentIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'Vui lòng chọn ít nhất một học sinh',
        },
        { status: 400 }
      );
    }

    // ========================================================
    // KIỂM TRA LỚP
    // ========================================================

    const classData = await prisma.classes.findFirst({
      where: {
        id: classId,
        teacher_id: session.userId,
      },
      select: {
        id: true,
        name: true,
        grade_id: true,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Không tìm thấy lớp học' },
        { status: 404 }
      );
    }

    // ========================================================
    // KIỂM TRA TẤT CẢ HỌC SINH
    // ========================================================

    const studentProfiles =
      await prisma.student_profiles.findMany({
        where: {
          user_id: {
            in: studentIds,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
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
      });

    // Những ID thực sự có hồ sơ học sinh
    const validStudentIds =
      studentProfiles.map(
        (student) => student.user_id
      );

    // Những ID không tồn tại hồ sơ
    const invalidStudentIds =
      studentIds.filter(
        (id) =>
          !validStudentIds.includes(id)
      );

    // ========================================================
    // KIỂM TRA TÀI KHOẢN ACTIVE
    // ========================================================

    const inactiveStudents =
      studentProfiles.filter(
        (student) =>
          student.user.status !== 'active'
      );

    if (inactiveStudents.length > 0) {
      const names = inactiveStudents
        .map(
          (student) =>
            student.user.full_name
        )
        .join(', ');

      return NextResponse.json(
        {
          error: `Tài khoản học sinh không hoạt động: ${names}`,
        },
        { status: 400 }
      );
    }

    // Nếu có ID không có hồ sơ
    if (invalidStudentIds.length > 0) {
      return NextResponse.json(
        {
          error:
            'Một hoặc nhiều học sinh không có hồ sơ học sinh',
          invalidStudentIds,
        },
        { status: 404 }
      );
    }

    // ========================================================
    // LẤY ENROLLMENT HIỆN TẠI
    // ========================================================

    const existingEnrollments =
      await prisma.class_enrollments.findMany({
        where: {
          class_id: classId,
          student_id: {
            in: studentIds,
          },
        },
      });

    // ========================================================
    // PHÂN LOẠI
    // ========================================================

    const activeEnrollments =
      existingEnrollments.filter(
        (item) =>
          item.status === 'active'
      );

    const leftEnrollments =
      existingEnrollments.filter(
        (item) =>
          item.status === 'left'
      );

    const activeStudentIds =
      new Set(
        activeEnrollments.map(
          (item) => item.student_id
        )
      );

    // Học sinh chưa từng có trong lớp
    const newStudentIds =
      studentIds.filter(
        (studentId) =>
          !existingEnrollments.some(
            (item) =>
              item.student_id === studentId
          )
      );

    // Học sinh từng rời lớp
    const leftStudentIds =
      new Set(
        leftEnrollments.map(
          (item) => item.student_id
        )
      );

    // ========================================================
    // CẬP NHẬT LẠI HỌC SINH ĐÃ RỜI LỚP
    // ========================================================

    const studentsToReactivate =
      studentIds.filter(
        (studentId) =>
          leftStudentIds.has(studentId)
      );

    for (const studentId of studentsToReactivate) {
      const enrollment =
        leftEnrollments.find(
          (item) =>
            item.student_id ===
            studentId
        );

      if (enrollment) {
        await prisma.class_enrollments.update({
          where: {
            id: enrollment.id,
          },
          data: {
            status: 'active',
            joined_at: new Date(),
          },
        });
      }
    }

    // ========================================================
    // TẠO ENROLLMENT MỚI
    // ========================================================

    if (newStudentIds.length > 0) {
      await prisma.class_enrollments.createMany({
        data: newStudentIds.map(
          (studentId) => ({
            class_id: classId,
            student_id: studentId,
            status: 'active',
          })
        ),
        skipDuplicates: true,
      });
    }

    // ========================================================
    // THỐNG KÊ KẾT QUẢ
    // ========================================================

    const addedCount =
      newStudentIds.length +
      studentsToReactivate.length;

    const alreadyExistsCount =
      activeStudentIds.size;

    let message = '';

    if (addedCount === 1) {
      message =
        'Đã thêm 1 học sinh vào lớp';
    } else if (addedCount > 1) {
      message =
        `Đã thêm ${addedCount} học sinh vào lớp`;
    } else {
      message =
        'Tất cả học sinh đã có trong lớp';
    }

    return NextResponse.json(
      {
        success: addedCount > 0,
        message,

        data: {
          added: addedCount,
          already_exists:
            alreadyExistsCount,
          total_requested:
            studentIds.length,
          new_students:
            newStudentIds.length,
          reactivated:
            studentsToReactivate.length,
        },
      },
      {
        status:
          addedCount > 0 ? 201 : 409,
      }
    );
  } catch (error) {
    console.error(
      'POST /api/teachers/classes/[id]/students:',
      error
    );

    return NextResponse.json(
      {
        error: 'Không thể thêm học sinh',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE: Xóa học sinh khỏi lớp
// ============================================================

export async function DELETE(
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

    const { id: classId } = await params;

    const body = await request.json();

    const studentId = String(
      body.studentId || ''
    ).trim();

    if (!studentId) {
      return NextResponse.json(
        { error: 'Thiếu studentId' },
        { status: 400 }
      );
    }

    // Kiểm tra lớp
    const classData = await prisma.classes.findFirst({
      where: {
        id: classId,
        teacher_id: session.userId,
      },
      select: {
        id: true,
      },
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Không tìm thấy lớp học' },
        { status: 404 }
      );
    }

    // Tìm enrollment đang active
    const enrollment =
      await prisma.class_enrollments.findFirst({
        where: {
          class_id: classId,
          student_id: studentId,
          status: 'active',
        },
      });

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            'Học sinh không thuộc lớp này',
        },
        { status: 404 }
      );
    }

    // Không xóa bản ghi khỏi DB.
    // Chỉ chuyển trạng thái thành left.
    await prisma.class_enrollments.update({
      where: {
        id: enrollment.id,
      },
      data: {
        status: 'left',
      },
    });

    return NextResponse.json({
      success: true,
      message:
        'Đã xóa học sinh khỏi lớp',
    });
  } catch (error) {
    console.error(
      'DELETE /api/teachers/classes/[id]/students:',
      error
    );

    return NextResponse.json(
      {
        error: 'Không thể xóa học sinh',
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}