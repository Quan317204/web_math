
'use client';

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const QUICK_PROMPTS = [
  {
    icon: '💡',
    title: 'Gợi ý cách làm',
    prompt: 'Hãy hướng dẫn em giải một bài Toán theo từng bước, bắt đầu bằng một gợi ý nhỏ.',
  },
  {
    icon: '🧩',
    title: 'Bài tương tự',
    prompt: 'Hãy tạo cho em một bài Toán tương tự bài vừa học để em tự luyện tập. Đừng đưa đáp án ngay.',
  },
  {
    icon: '🔍',
    title: 'Tìm lỗi sai',
    prompt: 'Em muốn kiểm tra cách làm của mình. Hãy giúp em tìm lỗi sai và giải thích vì sao.',
  },
  {
    icon: '📘',
    title: 'Giải thích dễ hiểu',
    prompt: 'Hãy giải thích một kiến thức Toán khó bằng ngôn ngữ thật đơn giản, kèm ví dụ dễ hiểu.',
  },
];

function createMessage(
  role: ChatMessage['role'],
  content: string,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

export default function StudentAITutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, loading]);

  async function sendMessage(rawText: string) {
    const text = rawText.trim();

    if (!text || loading) {
      return;
    }

    const userMessage = createMessage('user', text);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade: Number(grade),
          messages: nextMessages.slice(-12).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử tiếp nhé.',
          );
        }

        throw new Error(
          data.message || 'Không thể kết nối AI Tutor lúc này.',
        );
      }

      if (!data.answer || typeof data.answer !== 'string') {
        throw new Error('AI chưa trả về câu trả lời hợp lệ.');
      }

      setMessages((current) => [
        ...current,
        createMessage('assistant', data.answer),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra. Em hãy thử lại nhé.',
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (input.trim() && !loading) {
        void sendMessage(input);
      }
    }
  }

  function resetConversation() {
    if (loading) {
      return;
    }

    setMessages([]);
    setInput('');
    setError('');
    textareaRef.current?.focus();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Thanh điều hướng */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/student"
              aria-label="Quay về trang học sinh"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-2xl shadow-sm">
              🧠
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                Smart Math AI Tutor
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Gia sư Toán đồng hành cùng em
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetConversation}
            disabled={loading || messages.length === 0}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cuộc trò chuyện mới
          </button>
        </header>

        {/* Chọn khối lớp */}
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div>
            <p className="font-semibold text-slate-800">
              🎒 Em đang học lớp mấy?
            </p>
            <p className="mt-1 text-sm text-slate-500">
              AI sẽ điều chỉnh cách giải thích theo lớp của em.
            </p>
          </div>

          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            disabled={loading}
            aria-label="Chọn khối lớp"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
          >
            {Array.from({ length: 9 }, (_, index) => index + 1).map(
              (level) => (
                <option key={level} value={String(level)}>
                  Lớp {level}
                </option>
              ),
            )}
          </select>
        </section>

        {/* Khung hội thoại */}
        <section
          className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          aria-label="Cuộc trò chuyện với AI Tutor"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Gia sư Toán AI
                </p>
                <p className="text-xs text-slate-500">
                  Hỏi bài, luyện tập và khám phá cách giải
                </p>
              </div>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Lớp {grade}
            </span>
          </div>

          <div className="flex-1 space-y-5 p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-2xl py-6 sm:py-10">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-5xl">
                  📚
                </div>

                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Chào em! Mình cùng học Toán nhé.
                  </h2>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
                    Em có thể gửi bài tập, hỏi về một kiến thức chưa hiểu,
                    hoặc nhờ mình gợi ý từng bước. Mình sẽ giúp em hiểu
                    cách làm thay vì chỉ đưa ra đáp án.
                  </p>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      disabled={loading}
                      onClick={() => void sendMessage(item.prompt)}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="mt-3 block font-semibold text-slate-800 group-hover:text-indigo-700">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-slate-500">
                        {item.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg">
                      🧠
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-indigo-600 text-white'
                        : 'rounded-bl-md border border-slate-100 bg-slate-50 text-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 sm:text-[15px]">
                      {message.content}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                      😊
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-start gap-3" aria-live="polite">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg">
                  🧠
                </div>
                <div className="rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" />
                    <span className="ml-1 text-sm text-slate-500">
                      Mình đang suy nghĩ...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    const lastUserMessage = [...messages]
                      .reverse()
                      .find((message) => message.role === 'user');

                    if (lastUserMessage) {
                      void sendMessage(lastUserMessage.content);
                    }
                  }}
                  disabled={loading}
                  className="mt-2 font-semibold underline disabled:opacity-50"
                >
                  Thử gửi lại
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Gợi ý nhanh khi đang trò chuyện */}
          {messages.length > 0 && !loading && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-6">
              {[
                'Gợi ý thêm cho em',
                'Cho em ví dụ tương tự',
                'Giải thích đơn giản hơn',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Ô nhập câu hỏi */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-100 bg-white p-3 sm:p-5"
          >
            <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                maxLength={4000}
                placeholder="Nhập bài Toán hoặc câu hỏi của em..."
                aria-label="Nhập câu hỏi Toán"
                className="max-h-36 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? (
                  <span className="animate-pulse">Đang gửi</span>
                ) : (
                  <>
                    <span>Gửi</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        d="M22 2L11 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M22 2L15 22l-4-9-9-4 20-7z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-slate-400">
              Enter để gửi · Shift + Enter để xuống dòng · Hãy kiểm tra lại
              lời giải trước khi áp dụng.
            </p>
          </form>
        </section>

        <footer className="py-4 text-center text-xs text-slate-400">
          Smart Math AI · Học từng bước, hiểu sâu hơn mỗi ngày.
        </footer>
      </div>
    </main>
  );
}