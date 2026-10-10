import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

import { getSession } from '@/lib/auth/session';

const QUESTION_TYPES = [
  'multiple_choice',
  'fill_number',
  'fill_expression',
  'input_answer',
  'real_world',
  'critical_thinking',
] as const;

const DIFFICULTIES = [
  'easy',
  'medium',
  'hard',
  'mixed',
] as const;

const EXERCISE_TYPES = [
  'worksheet',
  'practice',
  'quiz',
  'review',
  'advanced',
] as const;

type GeneratedQuestion = {
  type: string;
  content: string;
  options: string[];
  correctAnswer: string;
  solution: string;
  points: number;
};

function cleanJsonText(text: string) {
  let value = text.trim();

  if (value.startsWith('```json')) {
    value = value
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '');
  }

  if (value.startsWith('```')) {
    value = value
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');
  }

  return value.trim();
}

function normalizeQuestion(
  question: any,
  defaultType: string
): GeneratedQuestion | null {
  const content = String(
    question.content ??
      question.question ??
      ''
  ).trim();

  const options = Array.isArray(question.options)
    ? question.options
        .map((item: unknown) => String(item).trim())
        .filter(Boolean)
    : [];

  const correctAnswer = String(
    question.correctAnswer ??
      question.answer ??
      ''
  ).trim();

  const solution = String(
    question.solution ?? ''
  ).trim();

  if (
    !content ||
    !correctAnswer ||
    !solution
  ) {
    return null;
  }

  const type = QUESTION_TYPES.includes(
    question.type
  )
    ? question.type
    : defaultType;

  if (
    type === 'multiple_choice' &&
    options.length < 4
  ) {
    return null;
  }

  return {
    type,
    content,
    options,
    correctAnswer,
    solution,
    points:
      Number(question.points) > 0
        ? Number(question.points)
        : 1,
  };
}

export async function POST(
  request: Request
) {
  try {
    // =========================================================
    // 1. KIỂM TRA ĐĂNG NHẬP
    // =========================================================

    const session = await getSession();

    if (
      !session ||
      session.role !== 'teacher'
    ) {
      return NextResponse.json(
        {
          message:
            'Bạn không có quyền sử dụng chức năng AI.',
        },
        { status: 403 }
      );
    }

    // =========================================================
    // 2. ĐỌC REQUEST
    // =========================================================

    const body = await request.json();

    const {
      title,
      gradeId,
      chapterId,
      topicId,
      exerciseType,
      difficulty,
      questionType,
      quantity,
    } = body;

    // =========================================================
    // 3. VALIDATE INPUT
    // =========================================================

    if (!gradeId) {
      return NextResponse.json(
        {
          message: 'Thiếu gradeId.',
        },
        { status: 400 }
      );
    }

    if (!chapterId) {
      return NextResponse.json(
        {
          message: 'Thiếu chapterId.',
        },
        { status: 400 }
      );
    }

    if (!topicId) {
      return NextResponse.json(
        {
          message: 'Thiếu topicId.',
        },
        { status: 400 }
      );
    }

    if (
      !QUESTION_TYPES.includes(questionType)
    ) {
      return NextResponse.json(
        {
          message:
            'Dạng câu hỏi không hợp lệ.',
        },
        { status: 400 }
      );
    }

    if (
      !DIFFICULTIES.includes(difficulty)
    ) {
      return NextResponse.json(
        {
          message:
            'Độ khó không hợp lệ.',
        },
        { status: 400 }
      );
    }

    if (
      !EXERCISE_TYPES.includes(exerciseType)
    ) {
      return NextResponse.json(
        {
          message:
            'Loại bài tập không hợp lệ.',
        },
        { status: 400 }
      );
    }

    const count = Number(quantity);

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 50
    ) {
      return NextResponse.json(
        {
          message:
            'Số lượng câu phải từ 1 đến 50.',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 4. LẤY THÔNG TIN CHƯƠNG / CHỦ ĐỀ
    // =========================================================

    const [
      grade,
      chapter,
      topic,
    ] = await Promise.all([
      prisma.grades.findUnique({
        where: {
          id: gradeId,
        },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.chapters.findUnique({
        where: {
          id: chapterId,
        },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.topics.findUnique({
        where: {
          id: topicId,
        },
        select: {
          id: true,
          name: true,
          name_en: true,
        },
      }),
    ]);

    if (!grade) {
      return NextResponse.json(
        {
          message: 'Không tìm thấy khối.',
        },
        { status: 404 }
      );
    }

    if (!chapter) {
      return NextResponse.json(
        {
          message: 'Không tìm thấy chương.',
        },
        { status: 404 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        {
          message: 'Không tìm thấy chủ đề.',
        },
        { status: 404 }
      );
    }

    // =========================================================
    // 5. GEMINI API KEY
    // =========================================================

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          message:
            'Chưa cấu hình GEMINI_API_KEY trong file .env.local.',
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 6. CHỌN MODEL GEMINI
    // =========================================================

    const model =
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash-lite';

    // =========================================================
    // 7. PROMPT
    // =========================================================

    const prompt = `
Bạn là AI chuyên tạo bài tập Toán K-9.

Hãy tạo đúng ${count} câu hỏi.

Thông tin:

Khối: ${grade.name}

Chương: ${chapter.name}

Chủ đề: ${topic.name}

Tên tiếng Anh chủ đề:
${topic.name_en || ''}

Loại bài tập:
${exerciseType}

Dạng câu hỏi:
${questionType}

Độ khó:
${difficulty}

YÊU CẦU BẮT BUỘC:

1. Câu hỏi phải phù hợp đúng với khối lớp.
2. Nội dung phải thuộc đúng chương và chủ đề.
3. Không tạo câu hỏi trùng nhau.
4. Mỗi câu phải có đáp án chính xác.
5. Mỗi câu phải có lời giải chi tiết, dễ hiểu.
6. Nếu là multiple_choice phải có đúng 4 phương án.
7. Với multiple_choice, correctAnswer phải là một trong:
   A, B, C hoặc D.
8. Không tạo nội dung ngoài phạm vi Toán học.
9. Không sử dụng Markdown.
10. Chỉ trả về JSON.
11. Phải tạo đủ ${count} câu.
12. Các câu phải khác nhau về số liệu hoặc cách hỏi.
13. Không được để content, correctAnswer hoặc solution rỗng.

Định dạng JSON bắt buộc:

{
  "questions": [
    {
      "type": "${questionType}",
      "content": "Nội dung câu hỏi",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "solution": "Lời giải chi tiết",
      "points": 1
    }
  ]
}

Lưu ý:

- Nếu questionType là multiple_choice:
  options phải chứa đúng 4 phương án.
  correctAnswer phải là A, B, C hoặc D.

- Nếu questionType không phải multiple_choice:
  options có thể là [].

- Không thêm bất kỳ trường nào ngoài:
  type,
  content,
  options,
  correctAnswer,
  solution,
  points.
`;

    // =========================================================
    // 8. GỌI GOOGLE GEMINI
    // =========================================================

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          'x-goog-api-key': apiKey,
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  'Bạn là AI tạo bài tập Toán chính xác. ' +
                  'Bạn phải trả về JSON hợp lệ theo đúng cấu trúc được yêu cầu.',
              },
            ],
          },

          contents: [
            {
              role: 'user',

              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0.7,

            responseMimeType:
              'application/json',
          },
        }),
      }
    );

    // =========================================================
    // 9. ĐỌC RESPONSE GEMINI
    // =========================================================

    const aiData =
      await aiResponse.json();

    if (!aiResponse.ok) {
      console.error(
        'Gemini API error:',
        aiData
      );

      return NextResponse.json(
        {
          message:
            aiData?.error?.message ||
            'Gemini tạo bài tập thất bại.',
        },
        { status: 502 }
      );
    }

    // =========================================================
    // 10. LẤY TEXT TỪ GEMINI
    // =========================================================

    const rawContent =
      aiData?.candidates?.[0]
        ?.content?.parts
        ?.map(
          (part: any) =>
            part?.text || ''
        )
        .join('')
        .trim();

    if (!rawContent) {
      console.error(
        'Gemini empty response:',
        aiData
      );

      return NextResponse.json(
        {
          message:
            'Gemini không trả về dữ liệu.',
        },
        { status: 502 }
      );
    }

    // =========================================================
    // 11. PARSE JSON
    // =========================================================

    let parsed: any;

    try {
      parsed = JSON.parse(
        cleanJsonText(rawContent)
      );
    } catch (jsonError) {
      console.error(
        'Gemini JSON parse error:',
        jsonError
      );

      console.error(
        'Gemini raw content:',
        rawContent
      );

      return NextResponse.json(
        {
          message:
            'Gemini trả về JSON không hợp lệ. Vui lòng thử lại.',
        },
        { status: 502 }
      );
    }

    // =========================================================
    // 12. NORMALIZE QUESTIONS
    // =========================================================

    const rawQuestions =
      Array.isArray(
        parsed?.questions
      )
        ? parsed.questions
        : [];

    const questions =
      rawQuestions
        .map(
          (question: any) =>
            normalizeQuestion(
              question,
              questionType
            )
        )
        .filter(
          (
            question: GeneratedQuestion | null
          ): question is GeneratedQuestion =>
            question !== null
        );

    // =========================================================
    // 13. KIỂM TRA SỐ CÂU
    // =========================================================

    if (
      questions.length !== count
    ) {
      return NextResponse.json(
        {
          message:
            `Gemini chỉ tạo được ${questions.length}/${count} câu hỏi hợp lệ. Vui lòng thử lại.`,
        },
        { status: 422 }
      );
    }

    // =========================================================
    // 14. TRẢ RESPONSE CHO FRONTEND
    // =========================================================

    return NextResponse.json({
      success: true,

      title:
        title ||
        `Bài tập ${topic.name}`,

      questions,
    });

  } catch (error) {
    console.error(
      'AI GENERATE ERROR:',
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Không thể tạo bài tập bằng Gemini.',
      },
      { status: 500 }
    );
  }
}

