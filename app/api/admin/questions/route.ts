
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/app/generated/prisma/client';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QUESTION_TYPES = [
  'multiple_choice',
  'fill_number',
  'drag_drop',
  'matching',
  'fill_expression',
  'ordering',
  'input_answer',
  'drawing',
  'real_world',
  'critical_thinking',
  'stem',
] as const;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const LANGUAGES = ['vi', 'en'] as const;
const STATUSES = ['draft', 'pending_review', 'approved', 'rejected'] as const;

async function authorizeAdmin() {
  const session = await getSession();
  return session?.role === 'admin' ? session : null;
}

function isOneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}

function parseJson(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Prisma.InputJsonValue;
    } catch {
      return null;
    }
  }
  if (
    typeof value === 'object' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value as Prisma.InputJsonValue;
  }
  return null;
}

function badJson(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value !== 'string') return false;
  try {
    JSON.parse(value);
    return false;
  } catch {
    return true;
  }
}

// GET /api/admin/questions
// Hỗ trợ tìm kiếm, lọc, phân trang và lấy dữ liệu bộ lọc.
export async function GET(request: NextRequest) {
  try {
    if (!(await authorizeAdmin())) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập.' },
        { status: 403 },
      );
    }

    const params = request.nextUrl.searchParams;

    if (params.get('options') === '1') {
      const [grades, topics, chapters] = await Promise.all([
        prisma.grades.findMany({
          select: { id: true, name: true, level_order: true },
          orderBy: { level_order: 'asc' },
        }),
        prisma.topics.findMany({
          select: { id: true, name: true, chapter_id: true },
          orderBy: { name: 'asc' },
        }),
        prisma.chapters.findMany({
          select: { id: true, name: true, grade_id: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      return NextResponse.json({ grades, topics, chapters });
    }

    const q = (params.get('q') ?? '').trim();
    const gradeId = params.get('grade_id') ?? '';
    const chapterId = params.get('chapter_id') ?? '';
    const topicId = params.get('topic_id') ?? '';
    const type = params.get('type') ?? '';
    const difficulty = params.get('difficulty') ?? '';
    const language = params.get('language') ?? '';
    const status = params.get('status') ?? '';

    const page = Math.max(1, Number(params.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 10));

    if (type && !isOneOf(type, QUESTION_TYPES)) {
      return NextResponse.json({ message: 'Dạng câu hỏi không hợp lệ.' }, { status: 400 });
    }
    if (difficulty && !isOneOf(difficulty, DIFFICULTIES)) {
      return NextResponse.json({ message: 'Độ khó không hợp lệ.' }, { status: 400 });
    }
    if (language && !isOneOf(language, LANGUAGES)) {
      return NextResponse.json({ message: 'Ngôn ngữ không hợp lệ.' }, { status: 400 });
    }
    if (status && !isOneOf(status, STATUSES)) {
      return NextResponse.json({ message: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }

    const where: Prisma.questionsWhereInput = {
      ...(q
        ? {
            OR: [
              { content: { contains: q, mode: 'insensitive' } },
              { solution: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(gradeId ? { grade_id: gradeId } : {}),
      ...(chapterId ? { chapter_id: chapterId } : {}),
      ...(topicId ? { topic_id: topicId } : {}),
      ...(type ? { type: type as (typeof QUESTION_TYPES)[number] } : {}),
      ...(difficulty ? { difficulty: difficulty as (typeof DIFFICULTIES)[number] } : {}),
      ...(language ? { language: language as (typeof LANGUAGES)[number] } : {}),
      ...(status ? { status: status as (typeof STATUSES)[number] } : {}),
    };

    const [questions, total, stats] = await Promise.all([
      prisma.questions.findMany({
        where,
        include: {
          grades: { select: { id: true, name: true, level_order: true } },
          topics: { select: { id: true, name: true } },
          chapters: { select: { id: true, name: true } },
          user: { select: { id: true, full_name: true, email: true } },
          _count: {
            select: {
              exercise_questions: true,
              submission_answers: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.questions.count({ where }),
      prisma.questions.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: Object.fromEntries(
        STATUSES.map((s) => [
          s,
          stats.find((item) => item.status === s)?._count._all ?? 0,
        ]),
      ),
    });
  } catch (error) {
    console.error('GET /api/admin/questions:', error);
    return NextResponse.json(
      { message: 'Không thể tải danh sách câu hỏi.' },
      { status: 500 },
    );
  }
}

// POST /api/admin/questions
export async function POST(request: NextRequest) {
  try {
    const session = await authorizeAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const body = await request.json();

    const grade_id = typeof body.grade_id === 'string' ? body.grade_id.trim() : '';
    const topic_id = typeof body.topic_id === 'string' ? body.topic_id.trim() : '';
    const chapter_id =
      typeof body.chapter_id === 'string' && body.chapter_id.trim()
        ? body.chapter_id.trim()
        : null;
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const solution =
      typeof body.solution === 'string' ? body.solution.trim() || null : null;

    if (!grade_id || !topic_id || !content) {
      return NextResponse.json(
        { message: 'Vui lòng chọn khối lớp, chủ đề và nhập nội dung câu hỏi.' },
        { status: 400 },
      );
    }

    if (!isOneOf(body.type, QUESTION_TYPES)) {
      return NextResponse.json({ message: 'Dạng câu hỏi không hợp lệ.' }, { status: 400 });
    }
    if (!isOneOf(body.difficulty, DIFFICULTIES)) {
      return NextResponse.json({ message: 'Độ khó không hợp lệ.' }, { status: 400 });
    }
    if (!isOneOf(body.language, LANGUAGES)) {
      return NextResponse.json({ message: 'Ngôn ngữ không hợp lệ.' }, { status: 400 });
    }
    if (!isOneOf(body.status, STATUSES)) {
      return NextResponse.json({ message: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }
    if (badJson(body.correct_answer) || badJson(body.content_data)) {
      return NextResponse.json({ message: 'Dữ liệu JSON không hợp lệ.' }, { status: 400 });
    }

    const correct_answer = parseJson(body.correct_answer);
    const content_data = parseJson(body.content_data);

    if (correct_answer === null) {
      return NextResponse.json({ message: 'Đáp án đúng không được để trống.' }, { status: 400 });
    }

    const [grade, topic, chapter] = await Promise.all([
      prisma.grades.findUnique({ where: { id: grade_id }, select: { id: true } }),
      prisma.topics.findUnique({
        where: { id: topic_id },
        select: { id: true, chapter_id: true },
      }),
      chapter_id
        ? prisma.chapters.findUnique({
            where: { id: chapter_id },
            select: { id: true, grade_id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!grade) {
      return NextResponse.json({ message: 'Khối lớp không tồn tại.' }, { status: 400 });
    }
    if (!topic) {
      return NextResponse.json({ message: 'Chủ đề không tồn tại.' }, { status: 400 });
    }
    if (chapter_id && !chapter) {
      return NextResponse.json({ message: 'Chương không tồn tại.' }, { status: 400 });
    }
    if (chapter && chapter.grade_id !== grade_id) {
      return NextResponse.json({ message: 'Chương không thuộc khối lớp đã chọn.' }, { status: 400 });
    }
    if (chapter_id && topic.chapter_id !== chapter_id) {
      return NextResponse.json({ message: 'Chủ đề không thuộc chương đã chọn.' }, { status: 400 });
    }

    const question = await prisma.questions.create({
      data: {
        grade_id,
        topic_id,
        chapter_id,
        type: body.type,
        difficulty: body.difficulty,
        language: body.language,
        content,
        content_data:
            content_data === null
                ? Prisma.DbNull
                : content_data,
        correct_answer,
        solution,
        status: body.status,
        is_ai_generated: false,
        created_by: session.userId,
      },
      include: {
        grades: { select: { id: true, name: true } },
        topics: { select: { id: true, name: true } },
        chapters: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { message: 'Tạo câu hỏi thành công.', question },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/admin/questions:', error);
    return NextResponse.json({ message: 'Không thể tạo câu hỏi.' }, { status: 500 });
  }
}
