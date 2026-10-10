'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Assignment = {
  id: string;
  startDate: string | null;
  dueDate: string | null;
};

type Question = {
  id: string;
  orderIndex: number;
  type: string;
  content: string;
  options: string[];
  points: number;
};

type Exercise = {
  id: string;
  title: string;
  exerciseType: string;
  difficulty: string | null;
  gradeName: string;
  chapterName: string | null;
  topicName: string | null;
  questionCount: number;
};

type Answer = {
  questionId: string;
  value: string;
};

type SubmitResult = {
  id: string;
  totalScore: number;
  maxScore: number;
  timeSpentSeconds: number | null;
  submittedAt: string | null;
};

export default function StudentExercisePage() {
  const params = useParams();

  const id = params.id as string;

  const [assignment, setAssignment] =
    useState<Assignment | null>(null);

  const [exercise, setExercise] =
    useState<Exercise | null>(null);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [answers, setAnswers] =
    useState<Answer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [result, setResult] =
    useState<SubmitResult | null>(null);

  const [error, setError] =
    useState('');

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [startTime] =
    useState<number>(() => Date.now());

  // =========================================================
  // LOAD BÀI TẬP
  // =========================================================

  useEffect(() => {
    if (id) {
      loadExercise();
    }
  }, [id]);

  async function loadExercise() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/student/exercises/${id}`,
        {
          cache: 'no-store',
        }
      );

      const contentType =
        response.headers.get('content-type') || '';

      if (
        !contentType.includes(
          'application/json'
        )
      ) {
        const text = await response.text();

        console.error(
          'API trả về không phải JSON:',
          text
        );

        throw new Error(
          `API trả về dữ liệu không hợp lệ (${response.status})`
        );
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Không thể tải bài tập'
        );
      }

      setAssignment(data.assignment);

      setExercise(data.exercise);

      const loadedQuestions =
        data.questions || [];

      setQuestions(loadedQuestions);

      // =====================================================
      // KIỂM TRA BÀI ĐÃ NỘP
      // =====================================================

      if (
        data.submitted &&
        data.submission
      ) {
        setResult(data.submission);
        setSubmitted(true);

        // Không cần tạo answer mới nữa
        setAnswers(
          loadedQuestions.map(
            (question: Question) => ({
              questionId: question.id,
              value: '',
            })
          )
        );

        return;
      }

      // =====================================================
      // BÀI CHƯA NỘP
      // =====================================================

      setSubmitted(false);
      setResult(null);

      setAnswers(
        loadedQuestions.map(
          (question: Question) => ({
            questionId: question.id,
            value: '',
          })
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải bài tập'
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // KIỂM TRA SUBMISSION ĐÃ NỘP
  // =========================================================
  //
  // Gọi API GET:
  // /api/student/submissions?exerciseId=...&assignmentId=...
  //
  // Nếu API GET chưa có thì phần này sẽ bỏ qua 404.
  // API POST vẫn có nhiệm vụ khóa việc nộp lại.
  // =========================================================

  async function checkExistingSubmission(
    exerciseId: string,
    assignmentId?: string
  ) {
    try {
      if (!assignmentId) {
        return;
      }

      const response =
        await fetch(
          `/api/student/submissions?exerciseId=${encodeURIComponent(
            exerciseId
          )}&assignmentId=${encodeURIComponent(
            assignmentId
          )}`,
          {
            cache: 'no-store',
          }
        );

      if (response.status === 404) {
        // API GET chưa được tạo
        // Không ảnh hưởng đến việc làm bài.
        return;
      }

      const contentType =
        response.headers.get(
          'content-type'
        ) || '';

      if (
        !contentType.includes(
          'application/json'
        )
      ) {
        return;
      }

      const data =
        await response.json();

      if (
        response.ok &&
        data.submitted &&
        data.submission
      ) {
        setResult(
          data.submission
        );

        setSubmitted(true);
      }
    } catch (error) {
      console.error(
        'Check existing submission error:',
        error
      );
    }
  }

  // =========================================================
  // CẬP NHẬT CÂU TRẢ LỜI
  // =========================================================

  function updateAnswer(
    questionId: string,
    value: string
  ) {
    if (submitted) {
      return;
    }

    setAnswers(
      (current) =>
        current.map(
          (answer) =>
            answer.questionId ===
            questionId
              ? {
                  ...answer,
                  value,
                }
              : answer
        )
    );
  }

  function getAnswer(
    questionId: string
  ) {
    return (
      answers.find(
        (answer) =>
          answer.questionId ===
          questionId
      )?.value || ''
    );
  }

  // =========================================================
  // CHUYỂN CÂU
  // =========================================================

  function nextQuestion() {
    if (submitted) {
      return;
    }

    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        (current) =>
          current + 1
      );
    }
  }

  function previousQuestion() {
    if (submitted) {
      return;
    }

    if (currentQuestion > 0) {
      setCurrentQuestion(
        (current) =>
          current - 1
      );
    }
  }

  // =========================================================
  // NỘP BÀI
  // =========================================================

  async function submitExercise() {
    if (
      !exercise ||
      !assignment
    ) {
      alert(
        'Không tìm thấy thông tin bài tập'
      );
      return;
    }

    if (
      submitting ||
      submitted
    ) {
      return;
    }

    const unanswered =
      questions.filter(
        (question) => {
          const answer =
            getAnswer(
              question.id
            );

          return (
            answer.trim() === ''
          );
        }
      );

    if (
      unanswered.length > 0
    ) {
      const confirmUnanswered =
        window.confirm(
          `Bạn còn ${unanswered.length} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`
        );

      if (!confirmUnanswered) {
        return;
      }
    }

    const confirmSubmit =
      window.confirm(
        'Bạn có chắc chắn muốn nộp bài không? Sau khi nộp, bạn sẽ không thể sửa câu trả lời.'
      );

    if (!confirmSubmit) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const timeSpentSeconds =
        Math.max(
          0,
          Math.floor(
            (Date.now() -
              startTime) /
              1000
          )
        );

      const response =
        await fetch(
          '/api/student/submissions',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              exerciseId:
                exercise.id,

              assignmentId:
                assignment.id,

              answers,

              timeSpentSeconds,
            }),
          }
        );

      const contentType =
        response.headers.get(
          'content-type'
        ) || '';

      if (
        !contentType.includes(
          'application/json'
        )
      ) {
        const text =
          await response.text();

        console.error(
          'Submit API trả về HTML:',
          text
        );

        throw new Error(
          `Server trả về dữ liệu không hợp lệ (${response.status})`
        );
      }

      const data =
        await response.json();

      // =====================================================
      // TRƯỜNG HỢP ĐÃ NỘP TRƯỚC ĐÓ
      // =====================================================

      if (
        response.status === 409 &&
        data.alreadySubmitted &&
        data.submission
      ) {
        setResult(
          data.submission
        );

        setSubmitted(true);

        setError('');

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Không thể nộp bài'
        );
      }

      // =====================================================
      // NỘP THÀNH CÔNG
      // =====================================================

      setResult(
        data.submission
      );

      setSubmitted(true);

      setError('');

      alert(
        `Nộp bài thành công!\nĐiểm: ${data.submission.totalScore} / ${data.submission.maxScore}`
      );
    } catch (error) {
      console.error(
        'Submit exercise error:',
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể nộp bài'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="mt-4 text-gray-500">
            Đang tải bài tập...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (
    error &&
    !exercise
  ) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">
            Không thể tải bài tập
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <Link
            href="/dashboard/student"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ← Về dashboard
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================
  // KHÔNG CÓ BÀI
  // =========================================================

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">
            Không tìm thấy bài tập.
          </p>

          <Link
            href="/dashboard/student"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Về dashboard
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================
  // ĐÃ NỘP BÀI
  // =========================================================

  if (
    submitted &&
    result
  ) {
    const percentage =
      result.maxScore > 0
        ? Math.round(
            (result.totalScore /
              result.maxScore) *
              100
          )
        : 0;

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <div className="text-6xl">
              🎉
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Bạn đã nộp bài
            </h1>

            <p className="mt-2 text-gray-500">
              {exercise.title}
            </p>

            <div className="mx-auto mt-8 max-w-md rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-500">
                Điểm của bạn
              </p>

              <p className="mt-2 text-5xl font-bold text-blue-600">
                {result.totalScore}

                <span className="text-2xl text-gray-400">
                  {' '}
                  /{' '}
                  {result.maxScore}
                </span>
              </p>

              <p className="mt-2 text-sm text-gray-500">
                {percentage}%
              </p>

              {result.submittedAt && (
                <p className="mt-3 text-xs text-gray-400">
                  Đã nộp:{' '}
                  {new Date(
                    result.submittedAt
                  ).toLocaleString(
                    'vi-VN'
                  )}
                </p>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              🔒 Bài tập đã được khóa.
              Bạn không thể làm lại
              hoặc thay đổi đáp án.
            </div>

            <div className="mt-8">
              <Link
                href="/dashboard/student"
                className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Về dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // KHÔNG CÓ CÂU HỎI
  // =========================================================

  if (
    questions.length === 0
  ) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8 text-center">
          <div className="text-5xl">
            📝
          </div>

          <h1 className="mt-4 text-xl font-bold">
            Bài tập chưa có câu hỏi
          </h1>

          <Link
            href="/dashboard/student"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Về dashboard
          </Link>
        </div>
      </div>
    );
  }

  const question =
    questions[currentQuestion];

  const currentAnswer =
    getAnswer(
      question.id
    );

  const answeredCount =
    answers.filter(
      (answer) =>
        answer.value.trim() !== ''
    ).length;

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/dashboard/student"
                className="text-sm text-gray-500 hover:text-blue-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-1 text-xl font-bold text-gray-900">
                {exercise.title}
              </h1>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">
                Tiến độ
              </p>

              <p className="font-semibold text-gray-900">
                {answeredCount} /{' '}
                {questions.length} câu
              </p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* THÔNG TIN */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">
              Khối
            </p>

            <p className="mt-1 font-medium">
              {exercise.gradeName}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">
              Chương
            </p>

            <p className="mt-1 font-medium">
              {exercise.chapterName ||
                '—'}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">
              Chủ đề
            </p>

            <p className="mt-1 font-medium">
              {exercise.topicName ||
                '—'}
            </p>
          </div>
        </div>

        {/* QUESTION */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                Câu{' '}
                {currentQuestion + 1}
              </span>

              <span className="text-sm text-gray-500">
                {question.points} điểm
              </span>
            </div>

            <div className="mt-6 whitespace-pre-wrap text-lg font-medium leading-8 text-gray-900">
              {question.content}
            </div>
          </div>

          {/* ANSWER */}
          <div className="p-6">
            {question.type ===
              'multiple_choice' &&
            question.options.length >
              0 ? (
              <div className="space-y-3">
                {question.options.map(
                  (
                    option,
                    index
                  ) => {
                    const selected =
                      currentAnswer ===
                      option;

                    return (
                      <button
                        key={index}
                        type="button"
                        disabled={
                          submitted ||
                          submitting
                        }
                        onClick={() =>
                          updateAnswer(
                            question.id,
                            option
                          )
                        }
                        className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                          selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        } ${
                          submitted
                            ? 'cursor-not-allowed opacity-60'
                            : ''
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-semibold ${
                            selected
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-gray-300 text-gray-600'
                          }`}
                        >
                          {String.fromCharCode(
                            65 +
                              index
                          )}
                        </span>

                        <span className="text-gray-900">
                          {option}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <textarea
                value={
                  currentAnswer
                }
                disabled={
                  submitted ||
                  submitting
                }
                onChange={(
                  event
                ) =>
                  updateAnswer(
                    question.id,
                    event.target.value
                  )
                }
                placeholder="Nhập câu trả lời của bạn..."
                rows={5}
                className="w-full rounded-xl border border-gray-300 p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            )}
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={
              previousQuestion
            }
            disabled={
              currentQuestion ===
                0 ||
              submitted ||
              submitting
            }
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Câu trước
          </button>

          {currentQuestion <
          questions.length -
            1 ? (
            <button
              type="button"
              onClick={
                nextQuestion
              }
              disabled={
                submitted ||
                submitting
              }
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Câu tiếp theo →
            </button>
          ) : (
            <button
              type="button"
              onClick={
                submitExercise
              }
              disabled={
                submitting ||
                submitted
              }
              className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Đang nộp bài...'
                : submitted
                  ? '✓ Đã nộp bài'
                  : '✓ Nộp bài'}
            </button>
          )}
        </div>

        {/* QUESTION NAVIGATOR */}
        <div className="mt-8 rounded-2xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">
            Danh sách câu hỏi
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {questions.map(
              (
                item,
                index
              ) => {
                const answered =
                  getAnswer(
                    item.id
                  ).trim() !== '';

                const active =
                  currentQuestion ===
                  index;

                return (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    disabled={
                      submitted ||
                      submitting
                    }
                    onClick={() =>
                      setCurrentQuestion(
                        index
                      )
                    }
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium ${
                      active
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : answered
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-600'
                    } disabled:cursor-not-allowed`}
                  >
                    {index + 1}
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-blue-600" />
              Đang làm
            </span>

            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-green-100" />
              Đã trả lời
            </span>

            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border bg-white" />
              Chưa trả lời
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}