import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

type QuestionInput = {
  id?: string;
  type:
    | 'multiple_choice'
    | 'fill_number'
    | 'fill_expression'
    | 'input_answer'
    | 'real_world'
    | 'critical_thinking';

  content: string;
  options?: string[];
  correctAnswer: string;
  solution?: string;
  points?: number;
};

type UpdateExerciseBody = {
  title: string;
  exerciseType:
    | 'worksheet'
    | 'practice'
    | 'quiz'
    | 'review'
    | 'advanced';
  gradeId: string;
  chapterId?: string | null;
  topicId: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questions: QuestionInput[];
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// ==============================
// GET - XEM BÀI TẬP + CÂU HỎI
// ==============================

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const exercise = await prisma.exercises.findFirst({
      where: {
        id,
        created_by: session.userId,
      },
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
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { message: 'Không tìm thấy bài tập' },
        { status: 404 }
      );
    }
    const grades = await prisma.grades.findMany({
    orderBy: {
        level_order: 'asc',
    },
    include: {
        chapters: {
        orderBy: {
            order_index: 'asc',
        },
        include: {
            topics: {
            orderBy: {
                order_index: 'asc',
            },
            },
        },
        },
    },
    });
    return NextResponse.json({
      exercise,
    });
  } catch (error) {
    console.error('GET EXERCISE ERROR:', error);

    return NextResponse.json(
      {
        message: 'Không thể tải bài tập',
      },
      { status: 500 }
    );
  }
}

// ==============================
// PUT - SỬA BÀI TẬP + CÂU HỎI
// ==============================

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        { message: 'Bạn không có quyền sửa bài tập' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const body = (await request.json()) as UpdateExerciseBody;

    const {
      title,
      exerciseType,
      gradeId,
      chapterId,
      topicId,
      difficulty,
      questions,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { message: 'Vui lòng nhập tên bài tập' },
        { status: 400 }
      );
    }

    if (!gradeId) {
      return NextResponse.json(
        { message: 'Vui lòng chọn khối lớp' },
        { status: 400 }
      );
    }

    if (!topicId) {
      return NextResponse.json(
        { message: 'Vui lòng chọn chủ đề' },
        { status: 400 }
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { message: 'Bài tập phải có ít nhất 1 câu hỏi' },
        { status: 400 }
      );
    }

    const existingExercise = await prisma.exercises.findFirst({
      where: {
        id,
        created_by: session.userId,
      },
      include: {
        assignments: true,
      },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { message: 'Không tìm thấy bài tập' },
        { status: 404 }
      );
    }

    const topic = await prisma.topics.findUnique({
      where: {
        id: topicId,
      },
    });

    if (!topic) {
      return NextResponse.json(
        { message: 'Chủ đề không tồn tại' },
        { status: 400 }
      );
    }

    if (chapterId && topic.chapter_id !== chapterId) {
      return NextResponse.json(
        {
          message: 'Chủ đề không thuộc chương đã chọn',
        },
        { status: 400 }
      );
    }

    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];

      if (!question.content?.trim()) {
        return NextResponse.json(
          {
            message: `Câu ${index + 1} chưa có nội dung`,
          },
          { status: 400 }
        );
      }

      if (!question.correctAnswer?.trim()) {
        return NextResponse.json(
          {
            message: `Câu ${index + 1} chưa có đáp án đúng`,
          },
          { status: 400 }
        );
      }

      if (
        question.type === 'multiple_choice' &&
        (!question.options || question.options.length < 2)
      ) {
        return NextResponse.json(
          {
            message: `Câu ${index + 1} phải có ít nhất 2 phương án`,
          },
          { status: 400 }
        );
      }
    }

    const updatedExercise = await prisma.$transaction(
      async (tx) => {
        await tx.exercises.update({
          where: {
            id,
          },
          data: {
            title: title.trim(),
            exercise_type: exerciseType,
            grade_id: gradeId,
            chapter_id: chapterId || null,
            topic_id: topicId,
            difficulty: difficulty || 'medium',
            question_count: questions.length,
          },
        });

        /*
         * Xóa liên kết cũ.
         * Không xóa questions cũ vì chúng có thể đang
         * được sử dụng ở bài tập khác.
         */
        await tx.exercise_questions.deleteMany({
          where: {
            exercise_id: id,
          },
        });

        for (let index = 0; index < questions.length; index++) {
          const question = questions[index];

          const contentData =
            question.type === 'multiple_choice'
              ? {
                  options: question.options || [],
                }
              : undefined;

          let questionId = question.id;

          /*
           * Nếu câu hỏi đã tồn tại thì cập nhật.
           * Nếu chưa có thì tạo mới.
           */
          if (questionId) {
            const oldQuestion = await tx.questions.findFirst({
              where: {
                id: questionId,
                created_by: session.userId,
              },
            });

            if (oldQuestion) {
              await tx.questions.update({
                where: {
                  id: questionId,
                },
                data: {
                  grade_id: gradeId,
                  chapter_id: chapterId || null,
                  topic_id: topicId,
                  type: question.type,
                  difficulty:
                    difficulty === 'mixed' || !difficulty
                      ? 'medium'
                      : difficulty,
                  content: question.content.trim(),
                  content_data: contentData,
                  correct_answer: {
                    value: question.correctAnswer.trim(),
                  },
                  solution:
                    question.solution?.trim() || null,
                },
              });
            } else {
              questionId = undefined;
            }
          }

          if (!questionId) {
            const createdQuestion = await tx.questions.create({
              data: {
                grade_id: gradeId,
                chapter_id: chapterId || null,
                topic_id: topicId,
                type: question.type,
                difficulty:
                  difficulty === 'mixed' || !difficulty
                    ? 'medium'
                    : difficulty,
                language: 'vi',
                content: question.content.trim(),
                content_data: contentData,
                correct_answer: {
                  value: question.correctAnswer.trim(),
                },
                solution:
                  question.solution?.trim() || null,
                is_ai_generated: false,
                created_by: session.userId,
                status: 'approved',
              },
            });

            questionId = createdQuestion.id;
          }

          await tx.exercise_questions.create({
            data: {
              exercise_id: id,
              question_id: questionId,
              order_index: index + 1,
              points: question.points || 1,
            },
          });
        }

        return tx.exercises.findUnique({
          where: {
            id,
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
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật bài tập thành công',
      exercise: updatedExercise,
    });
  } catch (error) {
    console.error('UPDATE EXERCISE ERROR:', error);

    return NextResponse.json(
      {
        message: 'Có lỗi xảy ra khi cập nhật bài tập',
      },
      { status: 500 }
    );
  }
}

// ==============================
// DELETE
// ==============================

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa bài tập' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const exercise = await prisma.exercises.findFirst({
      where: {
        id,
        created_by: session.userId,
      },
      include: {
        assignments: true,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { message: 'Không tìm thấy bài tập' },
        { status: 404 }
      );
    }

    if (exercise.assignments.length > 0) {
      return NextResponse.json(
        {
          message:
            'Không thể xóa bài tập đã được giao. Hãy hủy các lượt giao bài trước.',
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.exercise_questions.deleteMany({
        where: {
          exercise_id: id,
        },
      });

      await tx.exercises.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Xóa bài tập thành công',
    });
  } catch (error) {
    console.error('DELETE EXERCISE ERROR:', error);

    return NextResponse.json(
      {
        message: 'Không thể xóa bài tập',
      },
      { status: 500 }
    );
  }
}