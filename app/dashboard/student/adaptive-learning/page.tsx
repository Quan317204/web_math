// app/dashboard/student/adaptive-learning/page.tsx

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type TopicStat = {
  topicId: string;
  topicName: string;
  total: number;
  correct: number;
  accuracy: number;
  timeSpentSeconds: number;
};

type RecentResult = {
  submissionId: string;
  exerciseTitle: string;
  submittedAt: string | null;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
};

type Analysis = {
  success: boolean;
  profile: {
    gradeName: string | null;
    abilityLevel: string | null;
  };
  summary: {
    totalSubmissions: number;
    totalAnswers: number;
    correctAnswers: number;
    overallAccuracy: number;
    averageTimePerAnswerSeconds: number;
    recommendedDifficulty: 'easy' | 'medium' | 'hard';
    abilityLabel: string;
    advice: string;
  };
  topics: TopicStat[];
  weakTopics: TopicStat[];
  improvementTopics: TopicStat[];
  recentResults: RecentResult[];
};

type Recommendation = {
  lessonId: string;
  title: string;
  summary: string | null;
  topicId: string;
  topicName: string;
  chapterName: string;
  gradeName: string;
  orderIndex: number;
  completionPercent: number;
  reason: string;
};

type PracticeQuestion = {
  id: string;
  content: string;
  contentData: unknown;
  type: string;
  difficulty: string;
  topicId: string;
  topicName: string;
};

type PracticeState = {
  difficulty: string;
  questions: PracticeQuestion[];
};

function formatDuration(seconds: number) {
  if (!seconds || seconds < 0) return '0 giây';

  if (seconds < 60) return `${seconds} giây`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return remainingSeconds
    ? `${minutes} phút ${remainingSeconds} giây`
    : `${minutes} phút`;
}

function formatDate(value: string | null) {
  if (!value) return 'Chưa có thời gian';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return date.toLocaleString('vi-VN');
}

function difficultyLabel(value: string) {
  switch (value) {
    case 'easy':
      return 'Cơ bản';
    case 'medium':
      return 'Trung bình';
    case 'hard':
      return 'Nâng cao';
    default:
      return value;
  }
}

function getOptions(question: PracticeQuestion): string[] {
  const data = question.contentData;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }

  const record = data as Record<string, unknown>;
  const options = record.options;

  if (!Array.isArray(options)) return [];

  return options.map((option) => String(option));
}

function getInstruction(question: PracticeQuestion): string | null {
  const data = question.contentData;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.instruction === 'string') {
    return record.instruction;
  }

  return null;
}

export default function AdaptiveLearningPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState('');

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [analysisResponse, recommendationResponse] =
        await Promise.all([
          fetch('/api/student/adaptive-learning', {
            cache: 'no-store',
          }),
          fetch('/api/student/adaptive-learning/recommendations', {
            cache: 'no-store',
          }),
        ]);

      const analysisData = await analysisResponse.json();
      const recommendationData = await recommendationResponse.json();

      if (!analysisResponse.ok || !analysisData.success) {
        throw new Error(
          analysisData.message || 'Không thể tải phân tích học tập.',
        );
      }

      setAnalysis(analysisData);

      if (recommendationResponse.ok && recommendationData.success) {
        setRecommendations(recommendationData.recommendations ?? []);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi tải dữ liệu.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createPractice(
    difficulty?: string,
    topicId?: string,
  ) {
    setPracticeLoading(true);
    setPracticeError('');
    setPractice(null);
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);

    try {
      const response = await fetch(
        '/api/student/adaptive-learning/practice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: 10,
            ...(difficulty ? { difficulty } : {}),
            ...(topicId ? { topicId } : {}),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không tạo được bộ luyện tập.');
      }

      if (!data.questions?.length) {
        throw new Error(
          data.message || 'Chưa có câu hỏi phù hợp trong cơ sở dữ liệu.',
        );
      }

      setPractice({
        difficulty: data.difficulty,
        questions: data.questions,
      });
    } catch (err) {
      setPracticeError(
        err instanceof Error ? err.message : 'Không tạo được bộ luyện tập.',
      );
    } finally {
      setPracticeLoading(false);
    }
  }

  const questions = practice?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(
    (question) => (answers[question.id] ?? '').trim() !== '',
  ).length;

  const options = currentQuestion ? getOptions(currentQuestion) : [];
  const instruction = currentQuestion
    ? getInstruction(currentQuestion)
    : null;

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-gray-600">Đang phân tích tiến độ học tập...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/student"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Quay lại bảng điều khiển
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Học tập thích ứng
          </h1>

          <p className="mt-2 text-gray-600">
            Hệ thống phân tích kết quả và đề xuất nội dung phù hợp với bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Làm mới dữ liệu
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Tỷ lệ trả lời đúng"
              value={`${analysis.summary.overallAccuracy}%`}
              detail={`${analysis.summary.correctAnswers}/${analysis.summary.totalAnswers} câu đúng`}
            />

            <StatCard
              title="Bài đã hoàn thành"
              value={String(analysis.summary.totalSubmissions)}
              detail="Bài đã nộp hoặc chấm điểm"
            />

            <StatCard
              title="Thời gian trung bình"
              value={formatDuration(
                analysis.summary.averageTimePerAnswerSeconds,
              )}
              detail="Trên mỗi câu trả lời có dữ liệu thời gian"
            />

            <StatCard
              title="Mức độ đề xuất"
              value={difficultyLabel(
                analysis.summary.recommendedDifficulty,
              )}
              detail={analysis.summary.abilityLabel}
            />
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">
              Gợi ý học tập dành cho bạn
            </h2>
            <p className="mt-2 text-gray-700">
              {analysis.summary.advice}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Khối lớp: {analysis.profile.gradeName ?? 'Chưa được thiết lập'}
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-5">
              <h2 className="text-xl font-bold">Chủ đề cần củng cố</h2>
              <p className="mt-1 text-sm text-gray-500">
                Chủ đề có ít nhất 2 câu đã trả lời và tỷ lệ đúng dưới 70%.
              </p>

              {analysis.weakTopics.length === 0 ? (
                <p className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-600">
                  Chưa xác định được chủ đề yếu. Hãy tiếp tục làm bài để hệ
                  thống có thêm dữ liệu.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {analysis.weakTopics.map((topic) => (
                    <div key={topic.topicId}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="font-medium">{topic.topicName}</span>
                        <span className="font-semibold text-red-600">
                          {topic.accuracy}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{
                            width: `${Math.min(100, topic.accuracy)}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                        <span>
                          {topic.correct}/{topic.total} câu đúng
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            void createPractice('easy', topic.topicId)
                          }
                          disabled={practiceLoading}
                          className="font-semibold text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Luyện chủ đề này
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <h2 className="text-xl font-bold">Chủ đề tiến bộ</h2>

              {analysis.improvementTopics.length === 0 ? (
                <p className="mt-4 text-gray-500">
                  Hãy luyện tập thêm để hệ thống nhận diện những chủ đề bạn
                  đã nắm vững.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {analysis.improvementTopics.slice(0, 6).map((topic) => (
                    <div key={topic.topicId}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="font-medium">{topic.topicName}</span>
                        <span className="font-semibold text-green-700">
                          {topic.accuracy}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{
                            width: `${Math.min(100, topic.accuracy)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xl font-bold">Bài học được đề xuất</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ưu tiên bài học thuộc chủ đề cần cải thiện hoặc bài chưa hoàn
              thành trong khối lớp của bạn.
            </p>

            {recommendations.length === 0 ? (
              <p className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-600">
                Chưa có bài học phù hợp. Kiểm tra dữ liệu bài học, chủ đề và
                khối lớp trong cơ sở dữ liệu.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {recommendations.map((lesson) => (
                  <article
                    key={lesson.lessonId}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {lesson.chapterName} · {lesson.topicName}
                    </p>

                    <h3 className="mt-2 font-bold text-gray-900">
                      {lesson.title}
                    </h3>

                    {lesson.summary && (
                      <p className="mt-2 text-sm text-gray-600">
                        {lesson.summary}
                      </p>
                    )}

                    <p className="mt-3 text-sm text-gray-500">
                      {lesson.reason}
                    </p>

                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>Tiến độ</span>
                        <span>{lesson.completionPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, lesson.completionPercent),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/student/curriculum?lessonId=${encodeURIComponent(lesson.lessonId)}`}
                      className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Học bài này
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xl font-bold">Luyện tập thích ứng</h2>
            <p className="mt-1 text-sm text-gray-600">
              Bộ câu hỏi được chọn từ ngân hàng câu hỏi đã duyệt, theo khối
              lớp và mức độ phù hợp.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => void createPractice(difficulty)}
                  disabled={practiceLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {practiceLoading
                    ? 'Đang tạo...'
                    : `Luyện ${difficultyLabel(difficulty).toLowerCase()}`}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  void createPractice(
                    analysis.summary.recommendedDifficulty,
                  )
                }
                disabled={practiceLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Luyện theo năng lực
              </button>
            </div>

            {practiceError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {practiceError}
              </p>
            )}

            {practice && questions.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">
                    Bộ luyện tập · {difficultyLabel(practice.difficulty)}
                  </h3>
                  <span className="text-sm text-gray-500">
                    Đã trả lời {answeredCount}/{questions.length} câu
                  </span>
                </div>

                {!submitted && currentQuestion && (
                  <div className="mt-5">
                    <p className="text-sm text-gray-500">
                      Câu {currentIndex + 1}/{questions.length} ·{' '}
                      {currentQuestion.topicName}
                    </p>

                    {instruction && (
                      <p className="mt-3 text-sm text-gray-600">
                        {instruction}
                      </p>
                    )}

                    <p className="mt-3 whitespace-pre-wrap text-lg font-medium text-gray-900">
                      {currentQuestion.content}
                    </p>

                    {options.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {options.map((option, index) => {
                          const optionKey = String.fromCharCode(65 + index);
                          const selected =
                            answers[currentQuestion.id] === optionKey ||
                            answers[currentQuestion.id] === option;

                          return (
                            <label
                              key={`${currentQuestion.id}-${index}`}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                                selected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`answer-${currentQuestion.id}`}
                                checked={selected}
                                onChange={() =>
                                  setAnswers((previous) => ({
                                    ...previous,
                                    [currentQuestion.id]: optionKey,
                                  }))
                                }
                                className="mt-1"
                              />
                              <span>
                                <strong>{optionKey}.</strong> {option}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={answers[currentQuestion.id] ?? ''}
                        onChange={(event) =>
                          setAnswers((previous) => ({
                            ...previous,
                            [currentQuestion.id]: event.target.value,
                          }))
                        }
                        placeholder="Nhập câu trả lời của bạn"
                        className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    )}

                    <div className="mt-5 flex flex-wrap justify-between gap-3">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() =>
                          setCurrentIndex((index) => Math.max(0, index - 1))
                        }
                        className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40"
                      >
                        Câu trước
                      </button>

                      {currentIndex < questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentIndex((index) =>
                              Math.min(questions.length - 1, index + 1),
                            )
                          }
                          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
                        >
                          Câu tiếp theo
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSubmitted(true)}
                          className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white"
                        >
                          Hoàn thành luyện tập
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {submitted && (
                  <div className="mt-5 rounded-xl bg-green-50 p-4">
                    <h4 className="text-lg font-bold text-green-800">
                      Bạn đã hoàn thành bộ luyện tập!
                    </h4>
                    <p className="mt-2 text-gray-700">
                      Bạn đã trả lời {answeredCount}/{questions.length} câu.
                      Bộ luyện tập này hiện chưa được lưu vào lịch sử nộp bài.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void createPractice(
                          analysis.summary.recommendedDifficulty,
                        )
                      }
                      className="mt-4 rounded-lg bg-green-700 px-4 py-2 font-semibold text-white"
                    >
                      Luyện bộ câu hỏi mới
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xl font-bold">Kết quả làm bài gần đây</h2>

            {analysis.recentResults.length === 0 ? (
              <p className="mt-3 text-gray-500">
                Bạn chưa có bài nộp đã hoàn thành. Hãy làm bài được giao để hệ
                thống bắt đầu phân tích.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {analysis.recentResults.map((result) => (
                  <div
                    key={result.submissionId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {result.exerciseTitle}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(result.submittedAt)}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {result.correctAnswers}/{result.totalQuestions} câu đúng
                        {' · '}
                        {formatDuration(result.timeSpentSeconds)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        result.accuracy >= 70
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {result.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{detail}</p>
    </div>
  );
}