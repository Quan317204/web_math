
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/app/generated/prisma/client';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

const TYPES = [
  'multiple_choice', 'fill_number', 'drag_drop', 'matching',
  'fill_expression', 'ordering', 'input_answer', 'drawing',
  'real_world', 'critical_thinking', 'stem',
] as const;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const LANGUAGES = ['vi', 'en'] as const;
const STATUSES = ['draft', 'pending_review', 'approved', 'rejected'] as const;

async function isAdmin() {
  const session = await getSession();
  return session?.role === 'admin' ? session : null;
}

function valid(value: unknown, allowed: readonly string[]) {
  return typeof value === 'string' && allowed.includes(value);
}

function readJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Prisma.InputJsonValue;
    } catch {
      throw new Error('INVALID_JSON');
    }
  }
  if (value === null) throw new Error('INVALID_JSON');
  if (typeof value === 'object' || typeof value === 'number' || typeof value === 'boolean') {
    return value as Prisma.InputJsonValue;
  }
  throw new Error('INVALID_JSON');
}

// GET /api/admin/questions/:id
export async function GET(_request: NextRequest, context: Context) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { id } = await context.params;
    const question = await prisma.questions.findUnique({
      where: { id },
      include: {
        grades: { select: { id: true, name: true, level_order: true } },
        topics: { select: { id: true, name: true, chapter_id: true } },
        chapters: { select: { id: true, name: true } },
        user: { select: { id: true, full_name: true, email: true } },
        _count: {
          select: { exercise_questions: true, submission_answers: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ message: 'Không tìm thấy câu hỏi.' }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('GET /api/admin/questions/[id]:', error);
    return NextResponse.json({ message: 'Không thể tải câu hỏi.' }, { status: 500 });
  }
}

// PATCH /api/admin/questions/:id
// Có thể cập nhật nội dung hoặc chỉ cập nhật trạng thái để duyệt.
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await isAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const current = await prisma.questions.findUnique({
      where: { id },
      select: {
        id: true,
        grade_id: true,
        chapter_id: true,
        topic_id: true,
      },
    });

    if (!current) {
      return NextResponse.json({ message: 'Không tìm thấy câu hỏi.' }, { status: 404 });
    }

    const grade_id = body.grade_id === undefined ? current.grade_id : body.grade_id;
    const topic_id = body.topic_id === undefined ? current.topic_id : body.topic_id;
    const chapter_id =
      body.chapter_id === undefined
        ? current.chapter_id
        : (typeof body.chapter_id === 'string' && body.chapter_id.trim()
            ? body.chapter_id.trim()
            : null);

    const data: Prisma.questionsUncheckedUpdateInput = {};

    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || !body.content.trim()) {
        return NextResponse.json({ message: 'Nội dung câu hỏi không được để trống.' }, { status: 400 });
      }
      data.content = body.content.trim();
    }

    if (body.solution !== undefined) {
      if (body.solution !== null && typeof body.solution !== 'string') {
        return NextResponse.json({ message: 'Lời giải không hợp lệ.' }, { status: 400 });
      }
      data.solution = typeof body.solution === 'string' ? body.solution.trim() || null : null;
    }

    if (body.type !== undefined) {
      if (!valid(body.type, TYPES)) {
        return NextResponse.json({ message: 'Dạng câu hỏi không hợp lệ.' }, { status: 400 });
      }
      data.type = body.type as (typeof TYPES)[number];
    }

    if (body.difficulty !== undefined) {
      if (!valid(body.difficulty, DIFFICULTIES)) {
        return NextResponse.json({ message: 'Độ khó không hợp lệ.' }, { status: 400 });
      }
      data.difficulty = body.difficulty as (typeof DIFFICULTIES)[number];
    }

    if (body.language !== undefined) {
      if (!valid(body.language, LANGUAGES)) {
        return NextResponse.json({ message: 'Ngôn ngữ không hợp lệ.' }, { status: 400 });
      }
      data.language = body.language as (typeof LANGUAGES)[number];
    }

    if (body.status !== undefined) {
      if (!valid(body.status, STATUSES)) {
        return NextResponse.json({ message: 'Trạng thái không hợp lệ.' }, { status: 400 });
      }
      data.status = body.status as (typeof STATUSES)[number];
    }

    if (body.grade_id !== undefined) {
      if (typeof body.grade_id !== 'string' || !body.grade_id.trim()) {
        return NextResponse.json({ message: 'Khối lớp không hợp lệ.' }, { status: 400 });
      }
      data.grade_id = grade_id;
    }

    if (body.topic_id !== undefined) {
      if (typeof body.topic_id !== 'string' || !body.topic_id.trim()) {
        return NextResponse.json({ message: 'Chủ đề không hợp lệ.' }, { status: 400 });
      }
      data.topic_id = topic_id;
    }

    if (body.chapter_id !== undefined) data.chapter_id = chapter_id;

    if (body.correct_answer !== undefined) {
      data.correct_answer = readJson(body.correct_answer);
    }

    if (body.content_data !== undefined) {
      const parsed = readJson(body.content_data);
      data.content_data = parsed === undefined ? Prisma.DbNull : parsed;
    }

    if (body.is_ai_generated !== undefined) {
      if (typeof body.is_ai_generated !== 'boolean') {
        return NextResponse.json({ message: 'Giá trị nguồn AI không hợp lệ.' }, { status: 400 });
      }
      data.is_ai_generated = body.is_ai_generated;
    }

    if (!grade_id || !topic_id) {
      return NextResponse.json({ message: 'Cần chọn khối lớp và chủ đề.' }, { status: 400 });
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

    if (!grade || !topic || (chapter_id && !chapter)) {
      return NextResponse.json(
        { message: 'Khối lớp, chương hoặc chủ đề không tồn tại.' },
        { status: 400 },
      );
    }

    if (chapter && chapter.grade_id !== grade_id) {
      return NextResponse.json({ message: 'Chương không thuộc khối lớp đã chọn.' }, { status: 400 });
    }

    if (chapter_id && topic.chapter_id !== chapter_id) {
      return NextResponse.json({ message: 'Chủ đề không thuộc chương đã chọn.' }, { status: 400 });
    }

    const question = await prisma.questions.update({
      where: { id },
      data,
      include: {
        grades: { select: { id: true, name: true } },
        topics: { select: { id: true, name: true } },
        chapters: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ message: 'Cập nhật câu hỏi thành công.', question });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_JSON') {
      return NextResponse.json({ message: 'Dữ liệu JSON không hợp lệ.' }, { status: 400 });
    }
    console.error('PATCH /api/admin/questions/[id]:', error);
    return NextResponse.json({ message: 'Không thể cập nhật câu hỏi.' }, { status: 500 });
  }
}

// DELETE /api/admin/questions/:id
// Chỉ xóa khi câu hỏi chưa được sử dụng trong bài tập hoặc câu trả lời.
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ message: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { id } = await context.params;
    const question = await prisma.questions.findUnique({
      where: { id },
      include: {
        _count: {
          select: { exercise_questions: true, submission_answers: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ message: 'Không tìm thấy câu hỏi.' }, { status: 404 });
    }

    if (question._count.exercise_questions > 0 || question._count.submission_answers > 0) {
      return NextResponse.json(
        {
          message:
            'Câu hỏi đã được sử dụng trong bài tập hoặc bài làm. Hãy chuyển trạng thái sang "rejected" thay vì xóa để bảo toàn dữ liệu.',
        },
        { status: 409 },
      );
    }

    await prisma.questions.delete({ where: { id } });

    return NextResponse.json({ message: 'Đã xóa câu hỏi.' });
  } catch (error) {
    console.error('DELETE /api/admin/questions/[id]:', error);
    return NextResponse.json({ message: 'Không thể xóa câu hỏi.' }, { status: 500 });
  }
}
