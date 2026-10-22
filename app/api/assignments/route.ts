import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

/**
 * GET
 *
 * Không có exerciseId:
 *   -> trả về danh sách assignments
 *
 * Có exerciseId:
 *   -> trả về dữ liệu phục vụ trang giao bài:
 *      exercise
 *      classes
 *      students
 *      assignments
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        {
          error: 'Bạn không có quyền truy cập.',
        },
        {
          status: 403,
        }
      );
    }

    const { searchParams } = new URL(
      request.url
    );

    const exerciseId =
      searchParams.get('exerciseId');

    // =====================================================
    // TRƯỜNG HỢP 1:
    // GET /api/assignments
    // =====================================================

    if (!exerciseId) {
      const assignments =
        await prisma.assignments.findMany({
          where: {
            assigned_by: session.userId,
          },
          orderBy: {
            created_at: 'desc',
          },
        });

      // -------------------------
      // Exercises
      // -------------------------

      const exerciseIds: string[] = [
        ...new Set(
          assignments
            .map(
              (assignment) =>
                assignment.exercise_id
            )
            .filter(
              (id): id is string =>
                typeof id === 'string' &&
                id.length > 0
            )
        ),
      ];

      const exercises =
        exerciseIds.length > 0
          ? await prisma.exercises.findMany({
              where: {
                id: {
                  in: exerciseIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            })
          : [];

      const exerciseMap = new Map(
        exercises.map((exercise) => [
          exercise.id,
          exercise,
        ])
      );

      // -------------------------
      // Classes
      // -------------------------

      const classIds: string[] = [
        ...new Set(
          assignments
            .map(
              (assignment) =>
                assignment.class_id
            )
            .filter(
              (id): id is string =>
                typeof id === 'string' &&
                id.length > 0
            )
        ),
      ];

      const classes =
        classIds.length > 0
          ? await prisma.classes.findMany({
              where: {
                id: {
                  in: classIds,
                },
              },
              select: {
                id: true,
                name: true,
              },
            })
          : [];

      const classMap = new Map(
        classes.map((classItem) => [
          classItem.id,
          classItem,
        ])
      );

      // -------------------------
      // Students
      // -------------------------

      const studentIds: string[] = [
        ...new Set(
          assignments
            .map(
              (assignment) =>
                assignment.student_id
            )
            .filter(
              (id): id is string =>
                typeof id === 'string' &&
                id.length > 0
            )
        ),
      ];

      const students =
        studentIds.length > 0
          ? await prisma.user.findMany({
              where: {
                id: {
                  in: studentIds,
                },
              },
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            })
          : [];

      const studentMap = new Map(
        students.map((student) => [
          student.id,
          student,
        ])
      );

      // -------------------------
      // Groups
      // -------------------------

      const groupIds: string[] = [
        ...new Set(
          assignments
            .map(
              (assignment) =>
                assignment.group_id
            )
            .filter(
              (id): id is string =>
                typeof id === 'string' &&
                id.length > 0
            )
        ),
      ];

      const groups =
        groupIds.length > 0
          ? await prisma.student_groups.findMany({
              where: {
                id: {
                  in: groupIds,
                },
              },
              select: {
                id: true,
                name: true,
              },
            })
          : [];

      const groupMap = new Map(
        groups.map((group) => [
          group.id,
          group,
        ])
      );

      // -------------------------
      // Gộp dữ liệu
      // -------------------------

      const result = assignments.map(
        (assignment) => {
          const exercise =
            exerciseMap.get(
              assignment.exercise_id
            ) ?? null;

          const classItem =
            assignment.class_id
              ? classMap.get(
                  assignment.class_id
                ) ?? null
              : null;

          const student =
            assignment.student_id
              ? studentMap.get(
                  assignment.student_id
                ) ?? null
              : null;

          const group =
            assignment.group_id
              ? groupMap.get(
                  assignment.group_id
                ) ?? null
              : null;

          return {
            id: assignment.id,

            exercise_id:
              assignment.exercise_id,

            class_id:
              assignment.class_id,

            group_id:
              assignment.group_id,

            student_id:
              assignment.student_id,

            start_date:
              assignment.start_date,

            due_date:
              assignment.due_date,

            created_at:
              assignment.created_at,

            exercise: exercise
              ? {
                  id: exercise.id,
                  title: exercise.title,
                }
              : null,

            class: classItem
              ? {
                  id: classItem.id,
                  name: classItem.name,
                }
              : null,

            group: group
              ? {
                  id: group.id,
                  name: group.name,
                }
              : null,

            student: student
              ? {
                  user_id: student.id,
                  full_name:
                    student.full_name,
                  email: student.email,
                }
              : null,
          };
        }
      );

      return NextResponse.json(result);
    }

    // =====================================================
    // TRƯỜNG HỢP 2:
    // GET /api/assignments?exerciseId=...
    // =====================================================

    // -------------------------
    // Lấy bài tập
    // -------------------------

    const exercise =
      await prisma.exercises.findUnique({
        where: {
          id: exerciseId,
        },
        select: {
          id: true,
          title: true,
          question_count: true,
        },
      });

    if (!exercise) {
      return NextResponse.json(
        {
          error: 'Không tìm thấy bài tập.',
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------
    // Lấy lớp của giáo viên
    // -------------------------

    const classes =
      await prisma.classes.findMany({
        where: {
          teacher_id: session.userId,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,

          grades: {
            select: {
              name: true,
            },
          },

          _count: {
            select: {
              class_enrollments: true,
            },
          },
        },
      });

    // -------------------------
    // Lấy assignments của bài này
    // -------------------------

    const assignments =
      await prisma.assignments.findMany({
        where: {
          assigned_by: session.userId,
          exercise_id: exerciseId,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

    // -------------------------
    // Lấy học sinh thuộc các lớp
    // -------------------------

    const classIds = classes.map(
      (classItem) => classItem.id
    );

    const enrollments =
      classIds.length > 0
        ? await prisma.class_enrollments.findMany({
            where: {
              class_id: {
                in: classIds,
              },
            },
            select: {
              class_id: true,
              student_id: true,
            },
          })
        : [];

    const enrollmentStudentIds: string[] = [
      ...new Set(
        enrollments
          .map(
            (enrollment) =>
              enrollment.student_id
          )
          .filter(
            (id): id is string =>
              typeof id === 'string' &&
              id.length > 0
          )
      ),
    ];

    const users =
      enrollmentStudentIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: {
                in: enrollmentStudentIds,
              },

              role: 'student',

              status: 'active',
            },
            select: {
              id: true,
              full_name: true,
              email: true,
            },
            orderBy: {
              full_name: 'asc',
            },
          })
        : [];

    const userMap = new Map(
      users.map((user) => [
        user.id,
        user,
      ])
    );

    // -------------------------
    // Gắn class vào học sinh
    // -------------------------

    const students = enrollments
      .map((enrollment) => {
        const user = userMap.get(
          enrollment.student_id
        );

        if (!user) {
          return null;
        }

        const classItem = classes.find(
          (item) =>
            item.id === enrollment.class_id
        );

        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,

          class_id: enrollment.class_id,

          class_name:
            classItem?.name || '',
        };
      })
      .filter(
        (
          student
        ): student is NonNullable<
          typeof student
        > => student !== null
      );

    // -------------------------
    // Trả về
    // -------------------------

    return NextResponse.json({
      exercise,
      classes,
      students,
      assignments,
    });
  } catch (error) {
    console.error(
      'GET /api/assignments error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Không thể tải dữ liệu giao bài.',
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST
 *
 * Giao bài cho:
 * 1. Một lớp
 * 2. Một học sinh
 */
export async function POST(
  request: NextRequest
) {
  try {
    const session =
      await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        {
          error:
            'Bạn không có quyền giao bài.',
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const {
      exerciseId,
      classId,
      studentId,
      startDate,
      dueDate,
    } = body;

    // ==========================================
    // KIỂM TRA BÀI TẬP
    // ==========================================

    if (!exerciseId) {
      return NextResponse.json(
        {
          error:
            'Vui lòng chọn bài tập.',
        },
        {
          status: 400,
        }
      );
    }

    const exercise =
      await prisma.exercises.findUnique({
        where: {
          id: exerciseId,
        },
        select: {
          id: true,
        },
      });

    if (!exercise) {
      return NextResponse.json(
        {
          error:
            'Bài tập không tồn tại.',
        },
        {
          status: 404,
        }
      );
    }

    // ==========================================
    // PHẢI CHỌN LỚP HOẶC HỌC SINH
    // ==========================================

    if (!classId && !studentId) {
      return NextResponse.json(
        {
          error:
            'Vui lòng chọn lớp hoặc một học sinh.',
        },
        {
          status: 400,
        }
      );
    }

    if (classId && studentId) {
      return NextResponse.json(
        {
          error:
            'Chỉ được chọn lớp hoặc một học sinh.',
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // GIAO CHO LỚP
    // ==========================================

    if (classId) {
      const classItem =
        await prisma.classes.findFirst({
          where: {
            id: classId,
            teacher_id: session.userId,
          },
          select: {
            id: true,
            name: true,
          },
        });

      if (!classItem) {
        return NextResponse.json(
          {
            error:
              'Lớp không tồn tại hoặc không thuộc quyền quản lý của bạn.',
          },
          {
            status: 403,
          }
        );
      }

      // Kiểm tra đã giao chưa
      const existing =
        await prisma.assignments.findFirst({
          where: {
            exercise_id: exerciseId,
            assigned_by: session.userId,
            class_id: classId,
            student_id: null,
          },
        });

      if (existing) {
        return NextResponse.json(
          {
            error:
              `Bài tập đã được giao cho lớp ${classItem.name}.`,
          },
          {
            status: 409,
          }
        );
      }

      const assignment =
        await prisma.assignments.create({
          data: {
            exercise_id: exerciseId,
            assigned_by: session.userId,

            class_id: classId,

            group_id: null,
            student_id: null,

            start_date: startDate
              ? new Date(startDate)
              : null,

            due_date: dueDate
              ? new Date(dueDate)
              : null,
          },
        });

      return NextResponse.json(
        {
          message:
            `Đã giao bài cho lớp ${classItem.name}.`,
          assignment,
        },
        {
          status: 201,
        }
      );
    }

    // ==========================================
    // GIAO CHO MỘT HỌC SINH
    // ==========================================

    const student =
      await prisma.user.findFirst({
        where: {
          id: studentId,
          role: 'student',
          status: 'active',
        },
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      });

    if (!student) {
      return NextResponse.json(
        {
          error:
            'Không tìm thấy học sinh.',
        },
        {
          status: 404,
        }
      );
    }

    // ==========================================
    // KIỂM TRA HỌC SINH CÓ THUỘC LỚP
    // CỦA GIÁO VIÊN KHÔNG
    // ==========================================

    const teacherClasses =
      await prisma.classes.findMany({
        where: {
          teacher_id: session.userId,
        },
        select: {
          id: true,
        },
      });

    const teacherClassIds =
      teacherClasses.map(
        (item) => item.id
      );

    const enrollment =
      await prisma.class_enrollments.findFirst({
        where: {
          student_id: studentId,
          class_id: {
            in: teacherClassIds,
          },
        },
        select: {
          class_id: true,
        },
      });

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            'Học sinh này không thuộc lớp do bạn quản lý.',
        },
        {
          status: 403,
        }
      );
    }

    // ==========================================
    // KIỂM TRA ĐÃ GIAO
    // ==========================================

    const existing =
      await prisma.assignments.findFirst({
        where: {
          exercise_id: exerciseId,
          assigned_by: session.userId,
          student_id: studentId,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            `Bài tập đã được giao cho ${student.full_name}.`,
        },
        {
          status: 409,
        }
      );
    }

    // ==========================================
    // TẠO ASSIGNMENT CÁ NHÂN
    // ==========================================

    const assignment =
      await prisma.assignments.create({
        data: {
          exercise_id: exerciseId,
          assigned_by: session.userId,

          class_id: null,
          group_id: null,
          student_id: studentId,

          start_date: startDate
            ? new Date(startDate)
            : null,

          due_date: dueDate
            ? new Date(dueDate)
            : null,
        },
      });

    return NextResponse.json(
      {
        message:
          `Đã giao bài cho ${student.full_name}.`,
        assignment,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      'POST /api/assignments error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Không thể giao bài tập.',
      },
      {
        status: 500,
      }
    );
  }
}