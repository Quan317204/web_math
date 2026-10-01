import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

export async function GET() {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        {
          message: 'Bạn không có quyền truy cập',
        },
        { status: 403 }
      );
    }

    // Lấy các bài tập do giáo viên này tạo
    const exercises = await prisma.exercises.findMany({
      where: {
        created_by: session.userId,
      },
      select: {
        id: true,
      },
    });

    const exerciseIds = exercises.map(
      (exercise) => exercise.id
    );

    if (exerciseIds.length === 0) {
      return NextResponse.json({
        submissions: [],
      });
    }

    // Lấy các bài học sinh đã nộp
    const submissions =
      await prisma.submissions.findMany({
        where: {
          exercise_id: {
            in: exerciseIds,
          },
          status: {
            in: ['submitted', 'graded'],
          },
        },

        orderBy: {
          submitted_at: 'desc',
        },

        include: {
          exercises: {
            select: {
              id: true,
              title: true,
            },
          },

          student_profiles: {
            select: {
              user_id: true,

              user: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  avatar_url: true,
                },
              },
            },
          },

          assignments: {
            select: {
              id: true,
              class_id: true,
              group_id: true,
              student_id: true,

              classes: {
                select: {
                  id: true,
                  name: true,
                },
              },

              student_groups: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    const result = submissions.map(
      (submission) => ({
        id: submission.id,

        student: {
          id:
            submission.student_profiles.user.id,

          fullName:
            submission.student_profiles.user
              .full_name,

          email:
            submission.student_profiles.user
              .email,

          avatarUrl:
            submission.student_profiles.user
              .avatar_url,
        },

        exercise: {
          id: submission.exercises.id,

          title:
            submission.exercises.title,
        },

        assignment: submission.assignments
          ? {
              id:
                submission.assignments.id,

              className:
                submission.assignments.classes
                  ?.name ?? null,

              groupName:
                submission.assignments
                  .student_groups?.name ?? null,
            }
          : null,

        status:
          submission.status,

        totalScore:
          submission.total_score !== null
            ? Number(submission.total_score)
            : null,

        maxScore:
          submission.max_score !== null
            ? Number(submission.max_score)
            : null,

        timeSpentSeconds:
          submission.time_spent_seconds,

        startedAt:
          submission.started_at,

        submittedAt:
          submission.submitted_at,
      })
    );

    return NextResponse.json({
      submissions: result,
    });
  } catch (error) {
    console.error(
      'GET teacher submissions error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể tải danh sách bài đã nộp',
      },
      { status: 500 }
    );
  }
}

