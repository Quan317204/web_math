// app/api/student/adaptive-learning/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

type TopicStat = {
  topicId: string;
  topicName: string;
  total: number;
  correct: number;
  accuracy: number;
  timeSpentSeconds: number;
};

export async function GET() {
  try {
    const session = await requireRole('student');

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập bằng tài khoản học sinh.' },
        { status: 403 },
      );
    }

    const studentId = session.userId;

    const [profile, submissions] = await Promise.all([
      prisma.student_profiles.findUnique({
        where: { user_id: studentId },
        include: { grades: true },
      }),

      prisma.submissions.findMany({
        where: {
          student_id: studentId,
          status: { in: ['submitted', 'graded'] },
        },
        orderBy: { submitted_at: 'desc' },
        take: 100,
        include: {
          submission_answers: {
            include: {
              questions: {
                include: {
                  topics: true,
                },
              },
            },
          },
          exercises: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              topic_id: true,
              topics: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const topicMap = new Map<string, TopicStat>();
    let totalAnswers = 0;
    let correctAnswers = 0;
    let totalTimeSeconds = 0;
    let timedAnswerCount = 0;

    const recentResults = submissions.slice(0, 10).map((submission) => {
      const answers = submission.submission_answers;
      const answeredCount = answers.length;
      const correctCount = answers.filter(
        (answer) => answer.is_correct === true,
      ).length;

      const accuracy = answeredCount
        ? Math.round((correctCount / answeredCount) * 100)
        : 0;

      return {
        submissionId: submission.id,
        exerciseTitle: submission.exercises.title,
        submittedAt: submission.submitted_at,
        accuracy,
        totalQuestions: answeredCount,
        correctAnswers: correctCount,
        timeSpentSeconds: submission.time_spent_seconds ?? 0,
      };
    });

    for (const submission of submissions) {
      for (const answer of submission.submission_answers) {
        const question = answer.questions;
        const topic = question.topics;

        totalAnswers += 1;
        if (answer.is_correct === true) correctAnswers += 1;

        if (answer.time_spent_seconds != null) {
          totalTimeSeconds += answer.time_spent_seconds;
          timedAnswerCount += 1;
        }

        if (!topic) continue;

        const current = topicMap.get(topic.id) ?? {
          topicId: topic.id,
          topicName: topic.name,
          total: 0,
          correct: 0,
          accuracy: 0,
          timeSpentSeconds: 0,
        };

        current.total += 1;
        if (answer.is_correct === true) current.correct += 1;
        current.timeSpentSeconds += answer.time_spent_seconds ?? 0;
        current.accuracy = Math.round(
          (current.correct / current.total) * 100,
        );

        topicMap.set(topic.id, current);
      }
    }

    const topics = Array.from(topicMap.values()).sort(
      (a, b) => a.accuracy - b.accuracy,
    );

    const overallAccuracy = totalAnswers
      ? Math.round((correctAnswers / totalAnswers) * 100)
      : 0;

    let recommendedDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
    let abilityLabel = 'Cần củng cố kiến thức';
    let advice =
      'Hãy bắt đầu với bài tập cơ bản, đọc kỹ lời giải và luyện từng bước.';

    if (totalAnswers > 0) {
      if (overallAccuracy < 50) {
        recommendedDifficulty = 'easy';
        abilityLabel = 'Cần củng cố kiến thức';
        advice =
          'Ưu tiên ôn lại lý thuyết và làm các câu cơ bản ở những chủ đề có tỷ lệ đúng thấp.';
      } else if (overallAccuracy < 70) {
        recommendedDifficulty = 'easy';
        abilityLabel = 'Đang hình thành kiến thức';
        advice =
          'Tiếp tục luyện tập cơ bản và trung bình, đặc biệt ở các chủ đề chưa vững.';
      } else if (overallAccuracy < 85) {
        recommendedDifficulty = 'medium';
        abilityLabel = 'Nắm kiến thức khá tốt';
        advice =
          'Luyện bài mức trung bình, sau đó thử một số câu nâng cao để kiểm tra khả năng vận dụng.';
      } else {
        recommendedDifficulty = 'hard';
        abilityLabel = 'Nắm kiến thức tốt';
        advice =
          'Thử thách bản thân với câu hỏi nâng cao, đồng thời duy trì luyện tập để củng cố kiến thức.';
      }
    }

    const weakTopics = topics.filter(
      (topic) => topic.total >= 2 && topic.accuracy < 70,
    );

    const improvementTopics = topics.filter(
      (topic) => topic.total >= 2 && topic.accuracy >= 70,
    );

    return NextResponse.json({
      success: true,
      profile: {
        gradeName: profile?.grades?.name ?? null,
        abilityLevel: profile?.ability_level ?? null,
      },
      summary: {
        totalSubmissions: submissions.length,
        totalAnswers,
        correctAnswers,
        overallAccuracy,
        averageTimePerAnswerSeconds: timedAnswerCount
          ? Math.round(totalTimeSeconds / timedAnswerCount)
          : 0,
        recommendedDifficulty,
        abilityLabel,
        advice,
      },
      topics,
      weakTopics,
      improvementTopics,
      recentResults,
    });
  } catch (error) {
    console.error('GET adaptive learning error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Không thể phân tích tiến độ học tập lúc này.',
      },
      { status: 500 },
    );
  }
}