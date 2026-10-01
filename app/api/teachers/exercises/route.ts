import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

type QuestionInput = {
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

type CreateExerciseBody = {
  title: string;

  exerciseType:
    | 'worksheet'
    | 'practice'
    | 'quiz'
    | 'review'
    | 'advanced';

  gradeId: string;

  chapterId?: string;

  topicId: string;

  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';

  /**
   * manual:
   *   Tạo câu hỏi mới bằng form.
   *
   * bank:
   *   Chọn câu hỏi có sẵn trong ngân hàng.
   */
  source?: 'manual' | 'bank';

  /**
   * Dùng khi source = bank
   */
  questionIds?: string[];

  /**
   * Dùng khi source = manual
   */
  questions?: QuestionInput[];
};

// ======================================================
// GET
// ======================================================

export async function GET() {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        {
          message: 'Không có quyền truy cập',
        },
        {
          status: 403,
        }
      );
    }

    const [grades, exercises] = await Promise.all([
      prisma.grades.findMany({
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
      }),

      prisma.exercises.findMany({
        where: {
          created_by: session.userId,
        },

        orderBy: {
          created_at: 'desc',
        },

        include: {
          grades: true,
          chapters: true,
          topics: true,

          _count: {
            select: {
              exercise_questions: true,
              assignments: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      grades,
      exercises,
    });
  } catch (error) {
    console.error('GET TEACHER EXERCISES ERROR:', error);

    return NextResponse.json(
      {
        message: 'Không thể tải dữ liệu bài tập',
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// POST
// ======================================================

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        {
          message: 'Bạn không có quyền tạo bài tập',
        },
        {
          status: 403,
        }
      );
    }

    const body = (await request.json()) as CreateExerciseBody;

    const {
      title,
      exerciseType,
      gradeId,
      chapterId,
      topicId,
      difficulty,
      source = 'manual',
      questionIds = [],
      questions = [],
    } = body;

    // ==================================================
    // VALIDATE CHUNG
    // ==================================================

    if (!title?.trim()) {
      return NextResponse.json(
        {
          message: 'Vui lòng nhập tên bài tập',
        },
        {
          status: 400,
        }
      );
    }

    if (!gradeId) {
      return NextResponse.json(
        {
          message: 'Vui lòng chọn khối lớp',
        },
        {
          status: 400,
        }
      );
    }

    if (!topicId) {
      return NextResponse.json(
        {
          message: 'Vui lòng chọn chủ đề',
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // KIỂM TRA GRADE
    // ==================================================

    const grade = await prisma.grades.findUnique({
      where: {
        id: gradeId,
      },
    });

    if (!grade) {
      return NextResponse.json(
        {
          message: 'Khối lớp không tồn tại',
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // KIỂM TRA TOPIC
    // ==================================================

    const topic = await prisma.topics.findUnique({
      where: {
        id: topicId,
      },
    });

    if (!topic) {
      return NextResponse.json(
        {
          message: 'Chủ đề không tồn tại',
        },
        {
          status: 400,
        }
      );
    }

    if (chapterId && topic.chapter_id !== chapterId) {
      return NextResponse.json(
        {
          message: 'Chủ đề không thuộc chương đã chọn',
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // KIỂM TRA CHAPTER
    // ==================================================

    if (chapterId) {
      const chapter = await prisma.chapters.findUnique({
        where: {
          id: chapterId,
        },
      });

      if (!chapter) {
        return NextResponse.json(
          {
            message: 'Chương không tồn tại',
          },
          {
            status: 400,
          }
        );
      }

      if (chapter.grade_id !== gradeId) {
        return NextResponse.json(
          {
            message: 'Chương không thuộc khối đã chọn',
          },
          {
            status: 400,
          }
        );
      }
    }

    // ==================================================
    // SOURCE = BANK
    // ==================================================

    if (source === 'bank') {
      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return NextResponse.json(
          {
            message: 'Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng',
          },
          {
            status: 400,
          }
        );
      }

      // Loại bỏ ID trùng nhau
      const uniqueQuestionIds = [...new Set(questionIds)];

      // Lấy câu hỏi từ ngân hàng
      const bankQuestions = await prisma.questions.findMany({
        where: {
          id: {
            in: uniqueQuestionIds,
          },

          status: 'approved',
        },

        select: {
          id: true,
          grade_id: true,
          chapter_id: true,
          topic_id: true,
          type: true,
          difficulty: true,
          content: true,
          content_data: true,
          correct_answer: true,
          solution: true,
          status: true,
        },
      });

      // Không tìm thấy đủ câu
      if (bankQuestions.length !== uniqueQuestionIds.length) {
        return NextResponse.json(
          {
            message:
              'Một hoặc nhiều câu hỏi không tồn tại hoặc chưa được duyệt',
          },
          {
            status: 400,
          }
        );
      }

      // Kiểm tra câu hỏi có cùng khối
      const invalidGrade = bankQuestions.find(
        (question) => question.grade_id !== gradeId
      );

      if (invalidGrade) {
        return NextResponse.json(
          {
            message:
              'Có câu hỏi không thuộc khối lớp đã chọn',
          },
          {
            status: 400,
          }
        );
      }

      // Kiểm tra topic
      const invalidTopic = bankQuestions.find(
        (question) => question.topic_id !== topicId
      );

      if (invalidTopic) {
        return NextResponse.json(
          {
            message:
              'Có câu hỏi không thuộc chủ đề đã chọn',
          },
          {
            status: 400,
          }
        );
      }

      // Nếu chọn chapter thì kiểm tra chapter
      if (chapterId) {
        const invalidChapter = bankQuestions.find(
          (question) =>
            question.chapter_id !== chapterId
        );

        if (invalidChapter) {
          return NextResponse.json(
            {
              message:
                'Có câu hỏi không thuộc chương đã chọn',
            },
            {
              status: 400,
            }
          );
        }
      }

      // ==================================================
      // TẠO EXERCISE + LIÊN KẾT QUESTIONS
      // ==================================================

      const exercise = await prisma.$transaction(
        async (tx) => {
          const createdExercise =
            await tx.exercises.create({
              data: {
                title: title.trim(),

                exercise_type:
                  exerciseType || 'practice',

                grade_id: gradeId,

                chapter_id:
                  chapterId || null,

                topic_id: topicId,

                difficulty:
                  difficulty || 'medium',

                question_count:
                  uniqueQuestionIds.length,

                is_ai_generated: false,

                created_by: session.userId,
              },
            });

          for (
            let index = 0;
            index < uniqueQuestionIds.length;
            index++
          ) {
            await tx.exercise_questions.create({
              data: {
                exercise_id:
                  createdExercise.id,

                question_id:
                  uniqueQuestionIds[index],

                order_index: index + 1,

                points: 1,
              },
            });
          }

          return createdExercise;
        }
      );

      return NextResponse.json(
        {
          success: true,

          message:
            'Tạo bài tập từ ngân hàng câu hỏi thành công',

          exerciseId: exercise.id,

          questionCount:
            uniqueQuestionIds.length,
        },
        {
          status: 201,
        }
      );
    }

    // ==================================================
    // SOURCE = MANUAL
    // ==================================================

    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Bài tập phải có ít nhất 1 câu hỏi',
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // KIỂM TRA CÂU HỎI MANUAL
    // ==================================================

    for (
      let index = 0;
      index < questions.length;
      index++
    ) {
      const question = questions[index];

      if (!question.content?.trim()) {
        return NextResponse.json(
          {
            message:
              `Câu ${index + 1} chưa có nội dung`,
          },
          {
            status: 400,
          }
        );
      }

      if (!question.correctAnswer?.trim()) {
        return NextResponse.json(
          {
            message:
              `Câu ${index + 1} chưa có đáp án đúng`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        question.type === 'multiple_choice' &&
        (!question.options ||
          question.options.length < 2)
      ) {
        return NextResponse.json(
          {
            message:
              `Câu ${index + 1} phải có ít nhất 2 phương án`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        question.points !== undefined &&
        question.points <= 0
      ) {
        return NextResponse.json(
          {
            message:
              `Điểm của câu ${index + 1} phải lớn hơn 0`,
          },
          {
            status: 400,
          }
        );
      }
    }

    // ==================================================
    // TRANSACTION MANUAL
    // ==================================================

    const exercise = await prisma.$transaction(
      async (tx) => {
        const createdExercise =
          await tx.exercises.create({
            data: {
              title: title.trim(),

              exercise_type:
                exerciseType || 'practice',

              grade_id: gradeId,

              chapter_id:
                chapterId || null,

              topic_id: topicId,

              difficulty:
                difficulty || 'medium',

              question_count:
                questions.length,

              is_ai_generated: false,

              created_by: session.userId,
            },
          });

        for (
          let index = 0;
          index < questions.length;
          index++
        ) {
          const question = questions[index];

          const contentData =
            question.type ===
            'multiple_choice'
              ? {
                  options:
                    question.options || [],
                }
              : undefined;

          const createdQuestion =
            await tx.questions.create({
              data: {
                grade_id: gradeId,

                chapter_id:
                  chapterId || null,

                topic_id: topicId,

                type: question.type,

                difficulty:
                  difficulty === 'mixed' ||
                  !difficulty
                    ? 'medium'
                    : difficulty,

                language: 'vi',

                content:
                  question.content.trim(),

                content_data:
                  contentData,

                correct_answer: {
                  value:
                    question.correctAnswer.trim(),
                },

                solution:
                  question.solution?.trim() ||
                  null,

                is_ai_generated: false,

                created_by: session.userId,

                status: 'approved',
              },
            });

          await tx.exercise_questions.create({
            data: {
              exercise_id:
                createdExercise.id,

              question_id:
                createdQuestion.id,

              order_index:
                index + 1,

              points:
                question.points || 1,
            },
          });
        }

        return createdExercise;
      }
    );

    return NextResponse.json(
      {
        success: true,

        message:
          'Tạo bài tập thành công',

        exerciseId: exercise.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      'CREATE EXERCISE ERROR:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Có lỗi xảy ra khi tạo bài tập',
      },
      {
        status: 500,
      }
    );
  }
}