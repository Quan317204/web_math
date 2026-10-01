import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/app/generated/prisma/client';

import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

type SubmitAnswer = {
  questionId: string;
  value: string;
};

function normalizeAnswer(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Lấy đáp án đúng từ JSON correct_answer.
 *
 * Hỗ trợ:
 * { "value": "A" }
 * { "answer": "A" }
 * { "correct": "A" }
 * { "correctAnswer": "A" }
 * "A"
 * ["A", "B"]
 */
function getCorrectValues(correctAnswer: unknown): string[] {
  if (correctAnswer === null || correctAnswer === undefined) {
    return [];
  }

  if (
    typeof correctAnswer === 'string' ||
    typeof correctAnswer === 'number'
  ) {
    return [normalizeAnswer(correctAnswer)];
  }

  if (Array.isArray(correctAnswer)) {
    return correctAnswer
      .map((item) => normalizeAnswer(item))
      .filter(Boolean);
  }

  if (typeof correctAnswer === 'object') {
    const obj = correctAnswer as Record<string, unknown>;

    const possibleKeys = [
      'value',
      'answer',
      'correct',
      'correctAnswer',
    ];

    for (const key of possibleKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const value = obj[key];

        if (Array.isArray(value)) {
          return value
            .map((item) => normalizeAnswer(item))
            .filter(Boolean);
        }

        const normalized = normalizeAnswer(value);

        if (normalized) {
          return [normalized];
        }
      }
    }
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    // =========================================================
    // 1. KIỂM TRA QUYỀN
    // =========================================================

    const session = await requireRole('student');

    if (!session) {
      return NextResponse.json(
        {
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
        { status: 403 }
      );
    }

    // =========================================================
    // 2. ĐỌC DỮ LIỆU
    // =========================================================

    const body = await request.json();

    const exerciseId =
      typeof body.exerciseId === 'string'
        ? body.exerciseId
        : undefined;

    const assignmentId =
      typeof body.assignmentId === 'string'
        ? body.assignmentId
        : undefined;

    const answers = Array.isArray(body.answers)
      ? (body.answers as SubmitAnswer[])
      : [];

    const timeSpentSeconds =
      typeof body.timeSpentSeconds === 'number'
        ? Math.max(0, Math.floor(body.timeSpentSeconds))
        : null;

    if (!exerciseId) {
      return NextResponse.json(
        {
          message: 'Thiếu exerciseId',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 3. LẤY CÁC LỚP HỌC CỦA HỌC SINH
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
    // 4. LẤY CÁC NHÓM CỦA HỌC SINH
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
    // 5. KIỂM TRA ASSIGNMENT
    // =========================================================

    const assignmentConditions = [
      {
        student_id: session.userId,
      },

      ...(classIds.length > 0
        ? [
            {
              class_id: {
                in: classIds,
              },
            },
          ]
        : []),

      ...(groupIds.length > 0
        ? [
            {
              group_id: {
                in: groupIds,
              },
            },
          ]
        : []),
    ];

    const assignment =
      await prisma.assignments.findFirst({
        where: {
          exercise_id: exerciseId,

          ...(assignmentId
            ? {
                id: assignmentId,
              }
            : {}),

          OR: assignmentConditions,
        },
      });

    if (!assignment) {
      return NextResponse.json(
        {
          message: 'Bài tập này chưa được giao cho bạn',
        },
        { status: 404 }
      );
    }

    // =========================================================
    // 6. KIỂM TRA ĐÃ NỘP BÀI CHƯA
    // =========================================================

    const submittedSubmission =
      await prisma.submissions.findFirst({
        where: {
          student_id: session.userId,
          exercise_id: exerciseId,
          assignment_id: assignment.id,

          status: {
            in: ['submitted', 'graded'],
          },
        },

        orderBy: {
          submitted_at: 'desc',
        },
      });

    if (submittedSubmission) {
      return NextResponse.json(
        {
          success: false,
          alreadySubmitted: true,

          message:
            'Bạn đã nộp bài này rồi. Không thể nộp lại.',

          submission: {
            id: submittedSubmission.id,

            exerciseId:
              submittedSubmission.exercise_id,

            assignmentId:
              submittedSubmission.assignment_id,

            totalScore:
              Number(
                submittedSubmission.total_score ?? 0
              ),

            maxScore:
              Number(
                submittedSubmission.max_score ?? 0
              ),

            timeSpentSeconds:
              submittedSubmission.time_spent_seconds,

            submittedAt:
              submittedSubmission.submitted_at,
          },
        },
        { status: 409 }
      );
    }

    // =========================================================
    // 7. LẤY BÀI TẬP + CÂU HỎI
    // =========================================================

    const exercise =
      await prisma.exercises.findUnique({
        where: {
          id: exerciseId,
        },

        include: {
          exercise_questions: {
            orderBy: {
              order_index: 'asc',
            },

            include: {
              questions: true,
            },
          },
        },
      });

    if (!exercise) {
      return NextResponse.json(
        {
          message: 'Không tìm thấy bài tập',
        },
        { status: 404 }
      );
    }

    // =========================================================
    // 8. TÌM SUBMISSION ĐANG LÀM DỞ
    // =========================================================

    let submission =
      await prisma.submissions.findFirst({
        where: {
          student_id: session.userId,
          exercise_id: exerciseId,
          assignment_id: assignment.id,
          status: 'in_progress',
        },

        orderBy: {
          started_at: 'desc',
        },
      });

    // =========================================================
    // 9. TÍNH ĐIỂM
    // =========================================================

    let totalScore = 0;
    let maxScore = 0;

    const answerData =
      exercise.exercise_questions.map((item) => {
        const question = item.questions;

        // -----------------------------------------------------
        // Câu trả lời học sinh
        // -----------------------------------------------------

        const answer = answers.find(
          (answerItem) =>
            answerItem.questionId === question.id
        );

        const studentAnswer =
          typeof answer?.value === 'string'
            ? answer.value.trim()
            : '';

        // -----------------------------------------------------
        // Lấy đáp án đúng
        // -----------------------------------------------------

        const correctAnswer =
          question.correct_answer;

        const correctValues =
          getCorrectValues(correctAnswer);

        let correctValue =
          correctValues[0] ?? '';

        // -----------------------------------------------------
        // Lấy options
        // -----------------------------------------------------

        let options: string[] = [];

        const contentData =
          question.content_data;

        if (
          contentData &&
          typeof contentData === 'object' &&
          !Array.isArray(contentData) &&
          'options' in contentData
        ) {
          const rawOptions = (
            contentData as {
              options?: unknown;
            }
          ).options;

          if (Array.isArray(rawOptions)) {
            options = rawOptions.map((option) =>
              String(option)
            );
          }
        }

        // -----------------------------------------------------
        // MULTIPLE CHOICE
        //
        // DB:
        // correct_answer = {"value":"B"}
        //
        // options:
        // ["12", "36", "21", "3"]
        //
        // B => options[1] => "36"
        // -----------------------------------------------------

        if (
          question.type === 'multiple_choice' &&
          options.length > 0 &&
          correctValue.length === 1
        ) {
          const correctKey =
            correctValue.toUpperCase();

          const index =
            correctKey.charCodeAt(0) -
            'A'.charCodeAt(0);

          if (
            index >= 0 &&
            index < options.length
          ) {
            correctValue =
              options[index].trim();
          }
        }

        // -----------------------------------------------------
        // CHUẨN HÓA
        // -----------------------------------------------------

        const normalizedStudentAnswer =
          normalizeAnswer(studentAnswer);

        const normalizedCorrectAnswer =
          normalizeAnswer(correctValue);

        // -----------------------------------------------------
        // CHẤM ĐÚNG / SAI
        // -----------------------------------------------------

        const isCorrect =
          studentAnswer !== '' &&
          normalizedStudentAnswer ===
            normalizedCorrectAnswer;

        // -----------------------------------------------------
        // TÍNH ĐIỂM
        // -----------------------------------------------------

        const points =
          Number(item.points) || 0;

        const score =
          isCorrect ? points : 0;

        maxScore += points;
        totalScore += score;

        console.log('[GRADING]', {
          questionId: question.id,
          type: question.type,
          studentAnswer,
          correctValues,
          options,
          correctValue,
          isCorrect,
          points,
          score,
        });

        return {
          question_id: question.id,

          student_answer:
            studentAnswer === ''
              ? Prisma.JsonNull
              : {
                  value: studentAnswer,
                },

          is_correct: isCorrect,

          score,
        };
      });

    // =========================================================
    // 10. TẠO / CẬP NHẬT SUBMISSION
    // =========================================================

    submission = await prisma.$transaction(
      async (tx) => {
        let currentSubmission = submission;

        // -----------------------------------------------------
        // Nếu chưa có submission đang làm
        // -----------------------------------------------------

        if (!currentSubmission) {
          currentSubmission =
            await tx.submissions.create({
              data: {
                student_id: session.userId,

                exercise_id: exerciseId,

                assignment_id: assignment.id,

                status: 'in_progress',

                total_score: null,

                max_score: maxScore,

                time_spent_seconds:
                  timeSpentSeconds,

                started_at: new Date(),
              },
            });
        }

        // -----------------------------------------------------
        // Xóa answer cũ
        // -----------------------------------------------------

        await tx.submission_answers.deleteMany({
          where: {
            submission_id:
              currentSubmission.id,
          },
        });

        // -----------------------------------------------------
        // Lưu answer mới
        // -----------------------------------------------------

        if (answerData.length > 0) {
          await tx.submission_answers.createMany({
            data: answerData.map((answer) => ({
              submission_id:
                currentSubmission.id,

              question_id:
                answer.question_id,

              student_answer:
                answer.student_answer,

              is_correct:
                answer.is_correct,

              score:
                answer.score,
            })),
          });
        }

        // -----------------------------------------------------
        // Chuyển sang SUBMITTED
        // -----------------------------------------------------

        return await tx.submissions.update({
          where: {
            id: currentSubmission.id,
          },

          data: {
            status: 'submitted',

            total_score:
              totalScore,

            max_score:
              maxScore,

            time_spent_seconds:
              timeSpentSeconds,

            submitted_at:
              new Date(),
          },
        });
      }
    );

    // =========================================================
    // 11. TRẢ KẾT QUẢ
    // =========================================================

    return NextResponse.json({
      success: true,

      alreadySubmitted: false,

      message: 'Nộp bài thành công',

      submission: {
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
      },
    });
  } catch (error) {
    console.error(
      'POST /api/student/submissions error:',
      error
    );

    return NextResponse.json(
      {
        message: 'Không thể nộp bài',
      },
      { status: 500 }
    );
  }
}