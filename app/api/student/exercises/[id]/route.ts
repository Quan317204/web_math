import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    // =========================================================
    // 2. LẤY CÁC LỚP HỌC SINH ĐANG THAM GIA
    // =========================================================

    const enrollments =
      await prisma.class_enrollments.findMany({
        where: {
          student_id: session.userId,
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
          student_id: session.userId,
        },
        select: {
          group_id: true,
        },
      });

    const groupIds = groupMembers.map(
      (item) => item.group_id
    );

    // =========================================================
    // 4. TÌM ASSIGNMENT
    // =========================================================

    const assignment =
      await prisma.assignments.findFirst({
        where: {
          exercise_id: id,

          OR: [
            // Giao trực tiếp cho học sinh
            {
              student_id: session.userId,
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

        include: {
          exercises: {
            include: {
              grades: true,
              chapters: true,
              topics: true,

              exercise_questions: {
                orderBy: {
                  order_index: 'asc',
                },

                include: {
                  questions: true,
                },
              },
            },
          },
        },
      });

    // =========================================================
    // 5. KHÔNG TÌM THẤY ASSIGNMENT
    // =========================================================

    if (!assignment) {
      return NextResponse.json(
        {
          message: 'Bài tập này chưa được giao cho bạn',
        },
        { status: 404 }
      );
    }

    const exercise = assignment.exercises;

    // =========================================================
    // 6. KIỂM TRA HỌC SINH ĐÃ NỘP BÀI CHƯA
    // =========================================================

    const submission =
      await prisma.submissions.findFirst({
        where: {
          student_id: session.userId,

          exercise_id: exercise.id,

          assignment_id: assignment.id,

          status: {
            in: ['submitted', 'graded'],
          },
        },

        orderBy: {
          submitted_at: 'desc',
        },
      });

    // =========================================================
    // 7. CHUYỂN CÂU HỎI CHO FRONTEND
    // =========================================================

    const questions =
      exercise.exercise_questions.map(
        (item) => {
          const contentData =
            item.questions.content_data as
              | {
                  options?: unknown;
                }
              | null;

          return {
            id: item.questions.id,

            orderIndex:
              item.order_index,

            type:
              item.questions.type,

            content:
              item.questions.content,

            options:
              Array.isArray(
                contentData?.options
              )
                ? contentData.options.map(
                    String
                  )
                : [],

            points:
              Number(item.points),
          };
        }
      );

    // =========================================================
    // 8. TRẢ VỀ DỮ LIỆU
    // =========================================================

    return NextResponse.json({
      // -------------------------------------------------------
      // ASSIGNMENT
      // -------------------------------------------------------

      assignment: {
        id: assignment.id,

        startDate:
          assignment.start_date,

        dueDate:
          assignment.due_date,
      },

      // -------------------------------------------------------
      // EXERCISE
      // -------------------------------------------------------

      exercise: {
        id: exercise.id,

        title: exercise.title,

        exerciseType:
          exercise.exercise_type,

        difficulty:
          exercise.difficulty,

        gradeName:
          exercise.grades.name,

        chapterName:
          exercise.chapters?.name ?? null,

        topicName:
          exercise.topics?.name ?? null,

        questionCount:
          exercise.question_count,
      },

      // -------------------------------------------------------
      // QUESTIONS
      // -------------------------------------------------------

      questions,

      // -------------------------------------------------------
      // SUBMISSION
      // -------------------------------------------------------
      //
      // Nếu đã nộp:
      // submitted = true
      //
      // Nếu chưa nộp:
      // submitted = false
      //

      submitted: !!submission,

      submission: submission
        ? {
            id: submission.id,

            exerciseId:
              submission.exercise_id,

            assignmentId:
              submission.assignment_id,

            totalScore:
              Number(
                submission.total_score ?? 0
              ),

            maxScore:
              Number(
                submission.max_score ?? 0
              ),

            timeSpentSeconds:
              submission.time_spent_seconds,

            submittedAt:
              submission.submitted_at,

            status:
              submission.status,
          }
        : null,
    });
  } catch (error) {
    console.error(
      'GET student exercise error:',
      error
    );

    return NextResponse.json(
      {
        message: 'Không thể tải bài tập',
      },
      { status: 500 }
    );
  }
}