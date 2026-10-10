
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 12;

const SYSTEM_INSTRUCTION = `
Bạn là Smart Math AI Tutor, gia sư Toán thân thiện dành cho học sinh Việt Nam từ lớp 1 đến lớp 9.

NGUYÊN TẮC GIẢNG DẠY:
1. Trả lời bằng tiếng Việt, trừ khi học sinh yêu cầu ngôn ngữ khác.
2. Giải thích phù hợp với khối lớp mà học sinh cung cấp.
3. Dùng câu ngắn, từ ngữ đơn giản, ví dụ gần gũi.
4. Với câu hỏi bài tập, ưu tiên hướng dẫn từng bước để học sinh tự tìm ra đáp án.
5. Khi học sinh mới hỏi cách làm, hãy đưa ra gợi ý đầu tiên trước; không vội giải toàn bộ bài.
6. Nếu học sinh yêu cầu lời giải chi tiết, hãy trình bày từng bước và giải thích lý do.
7. Nếu học sinh hỏi vì sao sai, chỉ rõ chỗ sai một cách nhẹ nhàng, giải thích nguyên nhân và hướng dẫn sửa.
8. Nếu học sinh yêu cầu bài tương tự, hãy tạo một bài mới cùng dạng, thay đổi số liệu; chưa đưa đáp án ngay, trừ khi được yêu cầu.
9. Luôn kiểm tra tính đúng đắn của phép tính, đơn vị và kết luận trước khi trả lời.
10. Không bịa thông tin về chương trình học hoặc khẳng định chắc chắn khi chưa đủ dữ kiện.
11. Nếu đề bài thiếu dữ kiện hoặc hình vẽ, hãy hỏi học sinh bổ sung.
12. Không yêu cầu học sinh cung cấp mật khẩu, API key hoặc thông tin cá nhân nhạy cảm.

CÁCH TRÌNH BÀY:
- Chia lời giải thành các bước rõ ràng.
- Có thể dùng phép tính, phân số, ký hiệu Toán học và ví dụ.
- Có thể dùng sơ đồ bằng văn bản, ví dụ:
  12 cái kẹo: 🍬 🍬 🍬 🍬 | 🍬 🍬 🍬 🍬 | 🍬 🍬 🍬 🍬
- Không tuyên bố đã nhìn thấy hình ảnh hoặc tệp mà học sinh chưa gửi.
- Kết thúc bằng một câu hỏi nhỏ hoặc gợi ý tiếp theo khi phù hợp.
- Không đưa ra đáp án sai chỉ để khuyến khích học sinh.
`;

function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const messages: ChatMessage[] = [];

  for (const item of value.slice(-MAX_HISTORY_MESSAGES)) {
    if (
      !item ||
      typeof item !== 'object' ||
      !('role' in item) ||
      !('content' in item)
    ) {
      continue;
    }

    const role = item.role;
    const content = item.content;

    if (
      (role !== 'user' && role !== 'assistant') ||
      typeof content !== 'string'
    ) {
      continue;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      continue;
    }

    messages.push({
      role,
      content: trimmedContent.slice(0, MAX_MESSAGE_LENGTH),
    });
  }

  return messages;
}

export async function POST(request: Request) {
  try {
    // 1. Xác thực học sinh
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 },
      );
    }

    if (session.role !== 'student') {
      return NextResponse.json(
        { message: 'Chức năng AI Tutor chỉ dành cho học sinh.' },
        { status: 403 },
      );
    }

    // 2. Kiểm tra dữ liệu gửi lên
    let body: {
      messages?: unknown;
      grade?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ.' },
        { status: 400 },
      );
    }

    const messages = normalizeMessages(body.messages);
    const grade = Number(body.grade);

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { message: 'Vui lòng nhập câu hỏi Toán.' },
        { status: 400 },
      );
    }

    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { message: 'Tin nhắn cuối cùng phải là câu hỏi của học sinh.' },
        { status: 400 },
      );
    }

    if (lastMessage.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { message: 'Câu hỏi quá dài. Vui lòng rút gọn nội dung.' },
        { status: 400 },
      );
    }

    const studentGrade =
      Number.isInteger(grade) && grade >= 1 && grade <= 9
        ? grade
        : 3;

    // 3. Đọc cấu hình Gemini phía máy chủ
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY');

      return NextResponse.json(
        { message: 'Máy chủ chưa cấu hình khóa Gemini.' },
        { status: 500 },
      );
    }

    const model =
      process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // 4. Chuyển lịch sử hội thoại sang định dạng Gemini
    const contents = messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

    const ai = new GoogleGenAI({ apiKey });

    // 5. Gọi Gemini
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction:
          `${SYSTEM_INSTRUCTION}\n\n` +
          `Khối lớp hiện tại của học sinh: lớp ${studentGrade}. ` +
          `Ưu tiên cách giải và kiến thức phù hợp với lớp này.`,
        temperature: 0.5,
        maxOutputTokens: 2048,
      },
    });

    const answer = response.text?.trim();

    if (!answer) {
      console.error('Gemini returned an empty tutor response');

      return NextResponse.json(
        { message: 'AI chưa tạo được câu trả lời. Em hãy thử lại nhé.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      answer,
      model,
    });
  } catch (error) {
    console.error('AI TUTOR ERROR:', error);

    const message =
      error instanceof Error ? error.message : '';

    if (
      /api key|api_key|unauthorized|permission denied/i.test(message)
    ) {
      return NextResponse.json(
        {
          message:
            'Gemini từ chối yêu cầu. Hãy kiểm tra API key và quyền sử dụng model trong cấu hình máy chủ.',
        },
        { status: 502 },
      );
    }

    if (/model.*not found|not supported/i.test(message)) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy model Gemini đã cấu hình. Hãy kiểm tra giá trị GEMINI_MODEL.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        message:
          'Đã xảy ra lỗi khi kết nối AI Tutor. Em hãy thử gửi lại sau nhé.',
      },
      { status: 500 },
    );
  }
}