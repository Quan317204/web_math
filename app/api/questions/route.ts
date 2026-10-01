import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('teacher');

    if (!session) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const gradeId = searchParams.get('gradeId');
    const chapterId = searchParams.get('chapterId');
    const topicId = searchParams.get('topicId');
    const type = searchParams.get('type');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');

    const questions = await prisma.questions.findMany({
      where: {
        status: 'approved',

        ...(gradeId
          ? {
              grade_id: gradeId,
            }
          : {}),

        ...(chapterId
          ? {
              chapter_id: chapterId,
            }
          : {}),

        ...(topicId
          ? {
              topic_id: topicId,
            }
          : {}),

        ...(type
          ? {
              type: type as any,
            }
          : {}),

        ...(difficulty
          ? {
              difficulty: difficulty as any,
            }
          : {}),

        ...(search
          ? {
              content: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
      },

      orderBy: {
        created_at: 'desc',
      },

      include: {
        grades: true,
        chapters: true,
        topics: true,
      },

      take: 200,
    });

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('GET QUESTIONS ERROR:', error);

    return NextResponse.json(
      {
        message: 'Không thể tải ngân hàng câu hỏi',
      },
      {
        status: 500,
      }
    );
  }
}