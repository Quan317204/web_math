// app/api/student/adaptive-learning/practice/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('student');

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Bạn chưa đăng nhập.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const requestedCount = Number(body.count ?? 10);
    const count = Number.isFinite(requestedCount)
      ? Math.min(20, Math.max(5, Math.floor(requestedCount)))
      : 10;

    const requestedDifficulty = body.difficulty;
    const requestedTopicId =
      typeof body.topicId === 'string' ? body.topicId : undefined;

    const profile = await prisma.student_profiles.findUnique({
      where: { user_id: session.userId },
      select: { grade_id: true },
    });

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tài khoản chưa có hồ sơ học sinh hoặc chưa được gán khối lớp.',
        },
        { status: 400 },
      );
    }

    const recentAnswers = await prisma.submission_answers.findMany({
      where: {
        submissions: {
          student_id: session.userId,
          status: { in: ['submitted', 'graded'] },
        },
      },
      include: {
        questions: {
          select: { topic_id: true },
        },
      },
      take: 500,
    });

    const stats = new Map<
      string,
      { total: number; correct: number }
    >();

    for (const answer of recentAnswers) {
      const topicId = answer.questions.topic_id;
      const stat = stats.get(topicId) ?? { total: 0, correct: 0 };

      stat.total += 1;
      if (answer.is_correct === true) stat.correct += 1;
      stats.set(topicId, stat);
    }

    const weakestTopicIds = Array.from(stats.entries())
      .filter(([, stat]) => stat.total >= 2)
      .map(([topicId, stat]) => ({
        topicId,
        accuracy: stat.correct / stat.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)
      .map((item) => item.topicId);

    let difficulty: (typeof VALID_DIFFICULTIES)[number];

    if (
      VALID_DIFFICULTIES.includes(
        requestedDifficulty as (typeof VALID_DIFFICULTIES)[number],
      )
    ) {
      difficulty =
        requestedDifficulty as (typeof VALID_DIFFICULTIES)[number];
    } else {
      const total = recentAnswers.length;
      const correct = recentAnswers.filter(
        (answer) => answer.is_correct === true,
      ).length;
      const accuracy = total ? correct / total : 0;

      difficulty =
        total === 0 || accuracy < 0.7
          ? 'easy'
          : accuracy < 0.85
            ? 'medium'
            : 'hard';
    }

    const topicIds = requestedTopicId
      ? [requestedTopicId]
      : weakestTopicIds;

    const questions = await prisma.questions.findMany({
      where: {
        grade_id: profile.grade_id,
        status: 'approved',
        difficulty,
        ...(topicIds.length ? { topic_id: { in: topicIds } } : {}),
      },
      select: {
        id: true,
        content: true,
        content_data: true,
        type: true,
        difficulty: true,
        solution: true,
        topic_id: true,
        topics: {
          select: { name: true },
        },
      },
      take: count * 3,
    });

    // Nếu chủ đề yếu không có đủ câu hỏi ở mức đề xuất,
    // thử lấy câu hỏi cùng khối lớp ở mức độ đã chọn.
    const fallbackQuestions =
      questions.length >= Math.min(5, count)
        ? questions
        : await prisma.questions.findMany({
            where: {
              grade_id: profile.grade_id,
              status: 'approved',
              difficulty,
            },
            select: {
              id: true,
              content: true,
              content_data: true,
              type: true,
              difficulty: true,
              solution: true,
              topic_id: true,
              topics: {
                select: { name: true },
              },
            },
            take: count * 3,
          });

    // Xáo trộn câu hỏi và chỉ trả số lượng yêu cầu.
    const selected = [...fallbackQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    return NextResponse.json({
      success: true,
      difficulty,
      count: selected.length,
      questions: selected.map((question) => ({
        id: question.id,
        content: question.content,
        contentData: question.content_data,
        type: question.type,
        difficulty: question.difficulty,
        topicId: question.topic_id,
        topicName: question.topics.name,
        // Không trả đáp án đúng cho trình duyệt trước khi làm bài.
      })),
      message:
        selected.length > 0
          ? 'Đã tạo bộ luyện tập phù hợp với năng lực hiện tại.'
          : 'Chưa tìm thấy câu hỏi phù hợp. Hãy thử mức độ khác hoặc kiểm tra dữ liệu câu hỏi.',
    });
  } catch (error) {
    console.error('POST adaptive practice error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tạo bộ luyện tập thích ứng.',
      },
      { status: 500 },
    );
  }
}