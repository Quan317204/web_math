import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

export async function GET(_request: NextRequest) {
  try {
    // =========================================================
    // 1. KIỂM TRA QUYỀN HỌC SINH
    // =========================================================

    const session = await requireRole('student');

    if (!session) {
      return NextResponse.json(
        {
          message: 'Bạn không có quyền truy cập',
        },
        { status: 403 }
      );
    }

    const studentId = session.userId;

    // =========================================================
    // 2. LẤY CÁC LỚP HỌC SINH ĐANG THAM GIA
    // =========================================================

    const enrollments =
      await prisma.class_enrollments.findMany({
        where: {
          student_id: studentId,
          status: 'active',
        },
        select: {
          class_id: true,
        },
      });

    const classIds = enrollments.map(
      (item) => item.class_id
    );

    // =========================================================
    // 3. LẤY CÁC NHÓM HỌC SINH ĐANG THAM GIA
    // =========================================================

    const groupMembers =
      await prisma.student_group_members.findMany({
        where: {
          student_id: studentId,
        },
        select: {
          group_id: true,
        },
      });

    const groupIds = groupMembers.map(
      (item) => item.group_id
    );

    // =========================================================
    // 4. TÌM CÁC BÀI TẬP ĐƯỢC GIAO CHO HỌC SINH
    // =========================================================

    const assignments =
      await prisma.assignments.findMany({
        where: {
          OR: [
            // Giao trực tiếp cho học sinh
            {
              student_id: studentId,
            },

            // Giao cho lớp
            ...(classIds.length > 0
              ? [
                  {
                    class_id: {
                      in: classIds,
                    },
                  },
                ]
              : []),

            // Giao cho nhóm
            ...(groupIds.length > 0
              ? [
                  {
                    group_id: {
                      in: groupIds,
                    },
                  },
                ]
              : []),
          ],
        },

        orderBy: {
          created_at: 'desc',
        },

        include: {
          exercises: {
            include: {
              grades: true,
              chapters: true,
              topics: true,
            },
          },

          // ===================================================
          // QUAN TRỌNG:
          // LẤY SUBMISSION CỦA ĐÚNG HỌC SINH
          // ===================================================

          submissions: {
            where: {
              student_id: studentId,

              status: {
                in: ['submitted', 'graded'],
              },
            },

            orderBy: {
              submitted_at: 'desc',
            },

            take: 1,
          },
        },
      });

    // =========================================================
    // 5. CHUYỂN DỮ LIỆU CHO FRONTEND
    // =========================================================

    const exercises = assignments.map(
      (assignment) => {
        const exercise =
          assignment.exercises;

        const submission =
          assignment.submissions[0] ?? null;

        return {
          id: exercise.id,

          assignmentId:
            assignment.id,

          title: exercise.title,

          exerciseType:
            exercise.exercise_type,

          difficulty:
            exercise.difficulty,

          questionCount:
            exercise.question_count,

          gradeName:
            exercise.grades.name,

          chapterName:
            exercise.chapters?.name ?? null,

          topicName:
            exercise.topics?.name ?? null,

          startDate:
            assignment.start_date,

          dueDate:
            assignment.due_date,

          // =================================================
          // TRẠNG THÁI BÀI
          // =================================================

          submitted:
            !!submission,

          status:
            submission
              ? 'submitted'
              : 'not_started',

          // =================================================
          // KẾT QUẢ
          // =================================================

          submission:
            submission
              ? {
                  id: submission.id,

                  totalScore:
                    Number(
                      submission.total_score ??
                        0
                    ),

                  maxScore:
                    Number(
                      submission.max_score ??
                        0
                    ),

                  timeSpentSeconds:
                    submission.time_spent_seconds,

                  submittedAt:
                    submission.submitted_at,

                  status:
                    submission.status,
                }
              : null,
        };
      }
    );

    // =========================================================
    // 6. LOẠI BỎ BÀI TRÙNG
    // =========================================================
    //
    // Một bài có thể được giao:
    // - trực tiếp
    // - qua lớp
    // - qua nhóm
    //
    // Vì vậy cùng exercise có thể xuất hiện nhiều assignment.
    //
    // Ưu tiên assignment đã nộp.
    // =========================================================

    const exerciseMap =
      new Map<
        string,
        (typeof exercises)[number]
      >();

    for (const item of exercises) {
      const existing =
        exerciseMap.get(item.id);

      if (!existing) {
        exerciseMap.set(
          item.id,
          item
        );
        continue;
      }

      // Nếu bản ghi mới đã nộp
      // thì ưu tiên bản ghi này.
      if (
        item.submitted &&
        !existing.submitted
      ) {
        exerciseMap.set(
          item.id,
          item
        );
      }
    }

    const uniqueExercises =
      Array.from(
        exerciseMap.values()
      );

    // =========================================================
    // 7. TRẢ RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,

      exercises:
        uniqueExercises,

      total:
        uniqueExercises.length,
    });
  } catch (error) {
    console.error(
      'GET student exercises error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Không thể tải danh sách bài tập',
      },
      { status: 500 }
    );
  }
}