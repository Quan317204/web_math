// app/api/student/adaptive-learning/recommendations/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireRole('student');

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Bạn chưa đăng nhập.' },
        { status: 403 },
      );
    }

    const studentId = session.userId;

    const profile = await prisma.student_profiles.findUnique({
      where: { user_id: studentId },
      select: { grade_id: true },
    });

    if (!profile) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'Tài khoản chưa có hồ sơ học sinh. Hãy bổ sung khối lớp.',
      });
    }

    const [answers, progress] = await Promise.all([
      prisma.submission_answers.findMany({
        where: {
          submissions: {
            student_id: studentId,
            status: { in: ['submitted', 'graded'] },
          },
        },
        include: {
          questions: {
            select: {
              topic_id: true,
              topics: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 500,
      }),

      prisma.learning_progress.findMany({
        where: { student_id: studentId },
        select: { lesson_id: true, status: true, completion_percent: true },
      }),
    ]);

    const topicStats = new Map<
      string,
      { name: string; total: number; correct: number }
    >();

    for (const answer of answers) {
      const topic = answer.questions.topics;
      if (!topic) continue;

      const stat = topicStats.get(topic.id) ?? {
        name: topic.name,
        total: 0,
        correct: 0,
      };

      stat.total += 1;
      if (answer.is_correct === true) stat.correct += 1;
      topicStats.set(topic.id, stat);
    }

    const weakestTopicIds = Array.from(topicStats.entries())
      .map(([topicId, stat]) => ({
        topicId,
        accuracy: stat.total
          ? (stat.correct / stat.total) * 100
          : 0,
        total: stat.total,
      }))
      .filter((item) => item.total >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)
      .map((item) => item.topicId);

    const completedLessonIds = progress
      .filter(
        (item) =>
          item.status === 'completed' ||
          Number(item.completion_percent) >= 100,
      )
      .map((item) => item.lesson_id);

    const incompleteLessonIds = progress
      .filter(
        (item) =>
          item.status !== 'completed' &&
          Number(item.completion_percent) < 100,
      )
      .map((item) => item.lesson_id);

    const lessons = await prisma.lessons.findMany({
      where: {
        topics: {
          chapters: {
            grade_id: profile.grade_id,
          },
        },
        ...(completedLessonIds.length
          ? { id: { notIn: completedLessonIds } }
          : {}),
        ...(weakestTopicIds.length
          ? { topic_id: { in: weakestTopicIds } }
          : {}),
      },
      include: {
        topics: {
          include: {
            chapters: {
              include: {
                grades: true,
              },
            },
          },
        },
      },
      orderBy: [
        { order_index: 'asc' },
      ],
      take: 10,
    });

    // Nếu không có bài học thuộc chủ đề yếu, lấy bài học chưa hoàn thành
    // trong khối lớp để học sinh vẫn có gợi ý hữu ích.
    const fallbackLessons =
      lessons.length > 0
        ? lessons
        : await prisma.lessons.findMany({
            where: {
              topics: {
                chapters: {
                  grade_id: profile.grade_id,
                },
              },
              ...(completedLessonIds.length
                ? { id: { notIn: completedLessonIds } }
                : {}),
            },
            include: {
              topics: {
                include: {
                  chapters: {
                    include: {
                      grades: true,
                    },
                  },
                },
              },
            },
            orderBy: [{ order_index: 'asc' }],
            take: 10,
          });

    const recommendations = fallbackLessons.map((lesson) => {
      const stat = topicStats.get(lesson.topic_id);
      const isWeak = stat
        ? stat.total >= 2 && stat.correct / stat.total < 0.7
        : false;

      const currentProgress = progress.find(
        (item) => item.lesson_id === lesson.id,
      );

      return {
        lessonId: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        topicId: lesson.topic_id,
        topicName: lesson.topics.name,
        chapterName: lesson.topics.chapters.name,
        gradeName: lesson.topics.chapters.grades.name,
        orderIndex: lesson.order_index,
        completionPercent: Number(
          currentProgress?.completion_percent ?? 0,
        ),
        reason: isWeak
          ? `Nên ôn lại chủ đề "${lesson.topics.name}" vì kết quả làm bài đang thấp.`
          : 'Bài học tiếp theo phù hợp với khối lớp của bạn.',
      };
    });

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error('GET adaptive recommendations error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải đề xuất bài học.',
      },
      { status: 500 },
    );
  }
}