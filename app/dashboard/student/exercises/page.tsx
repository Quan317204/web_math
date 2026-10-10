'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Submission = {
  id: string;
  totalScore: number;
  maxScore: number;
  timeSpentSeconds: number | null;
  submittedAt: string | null;
  status: string;
};

type ExerciseItem = {
  id: string;
  assignmentId: string;

  title: string;
  exerciseType: string;
  difficulty: string | null;

  questionCount: number;

  gradeName: string;
  chapterName: string | null;
  topicName: string | null;

  startDate: string | null;
  dueDate: string | null;

  submitted: boolean;

  status:
    | 'submitted'
    | 'not_started';

  submission: Submission | null;
};

export default function StudentExercisesPage() {
  const [exercises, setExercises] =
    useState<ExerciseItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  // =========================================================
  // LOAD DANH SÁCH BÀI TẬP
  // =========================================================

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    try {
      setLoading(true);
      setError('');

      const response =
        await fetch(
          '/api/student/exercises',
          {
            cache: 'no-store',
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
            'Không thể tải danh sách bài tập'
        );
      }

      setExercises(
        data.exercises || []
      );
    } catch (error) {
      console.error(
        'Load student exercises error:',
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách bài tập'
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // FORMAT NGÀY
  // =========================================================

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return '—';
    }

    return new Date(
      value
    ).toLocaleDateString(
      'vi-VN'
    );
  }

  // =========================================================
  // FORMAT ĐIỂM
  // =========================================================

  function formatScore(
    submission: Submission
  ) {
    return `${submission.totalScore} / ${submission.maxScore}`;
  }

  // =========================================================
  // FORMAT LOẠI BÀI
  // =========================================================

  function getExerciseType(
    type: string
  ) {
    switch (type) {
      case 'worksheet':
        return 'Phiếu bài tập';

      case 'practice':
        return 'Bài luyện tập';

      case 'quiz':
        return 'Bài kiểm tra';

      case 'review':
        return 'Bài ôn tập';

      case 'advanced':
        return 'Bài nâng cao';

      default:
        return type;
    }
  }

  // =========================================================
  // FORMAT ĐỘ KHÓ
  // =========================================================

  function getDifficulty(
    difficulty: string | null
  ) {
    switch (difficulty) {
      case 'easy':
        return 'Dễ';

      case 'medium':
        return 'Trung bình';

      case 'hard':
        return 'Khó';

      case 'mixed':
        return 'Tổng hợp';

      default:
        return difficulty || '—';
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-gray-500">
              Đang tải danh sách bài tập...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-700">
              Không thể tải bài tập
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadExercises}
              className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // THỐNG KÊ
  // =========================================================

  const submittedCount =
    exercises.filter(
      (item) => item.submitted
    ).length;

  const notStartedCount =
    exercises.length -
    submittedCount;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <Link
                href="/dashboard/student"
                className="text-sm text-gray-500 hover:text-blue-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-2xl font-bold text-gray-900">
                Bài tập
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Danh sách bài tập được giao cho bạn
              </p>
            </div>

            <button
              type="button"
              onClick={loadExercises}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ↻ Làm mới
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* ===================================================
            STATISTICS
        ==================================================== */}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Tổng số bài
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {exercises.length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Đã nộp
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {submittedCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Chưa nộp
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-500">
              {notStartedCount}
            </p>
          </div>
        </div>

        {/* ===================================================
            EMPTY
        ==================================================== */}

        {exercises.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <div className="text-6xl">
              📚
            </div>

            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Chưa có bài tập
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Hiện tại bạn chưa được giao bài tập nào.
            </p>

            <Link
              href="/dashboard/student"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Về dashboard
            </Link>
          </div>
        ) : (
          /* =================================================
             EXERCISE LIST
          ================================================== */

          <div className="space-y-5">
            {exercises.map(
              (item) => {
                const isSubmitted =
                  item.submitted;

                return (
                  <div
                    key={`${item.id}-${item.assignmentId}`}
                    className={`rounded-2xl border bg-white p-6 shadow-sm transition ${
                      isSubmitted
                        ? 'border-green-200'
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {/* ======================================
                        TOP
                    ======================================= */}

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {/* TITLE + STATUS */}

                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold text-gray-900">
                            {item.title}
                          </h2>

                          {isSubmitted ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              🟢 Đã nộp
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                              🟡 Chưa làm
                            </span>
                          )}
                        </div>

                        {/* TYPE */}

                        <p className="mt-2 text-sm text-gray-500">
                          {getExerciseType(
                            item.exerciseType
                          )}
                        </p>

                        {/* INFO */}

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Khối
                            </p>

                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {item.gradeName}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Chương
                            </p>

                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {item.chapterName ||
                                '—'}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Chủ đề
                            </p>

                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {item.topicName ||
                                '—'}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Số câu
                            </p>

                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {item.questionCount}
                            </p>
                          </div>
                        </div>

                        {/* DATE */}

                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                          <span>
                            📅 Bắt đầu:{' '}
                            <strong className="font-medium text-gray-700">
                              {formatDate(
                                item.startDate
                              )}
                            </strong>
                          </span>

                          <span>
                            ⏰ Hạn nộp:{' '}
                            <strong className="font-medium text-gray-700">
                              {formatDate(
                                item.dueDate
                              )}
                            </strong>
                          </span>

                          <span>
                            📊 Độ khó:{' '}
                            <strong className="font-medium text-gray-700">
                              {getDifficulty(
                                item.difficulty
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* ====================================
                          RIGHT SIDE
                      ===================================== */}

                      <div className="flex shrink-0 flex-col gap-3 lg:min-w-[170px]">
                        {isSubmitted &&
                        item.submission ? (
                          <>
                            {/* SCORE */}

                            <div className="rounded-xl bg-green-50 p-4 text-center">
                              <p className="text-xs font-medium text-green-700">
                                Điểm
                              </p>

                              <p className="mt-1 text-2xl font-bold text-green-700">
                                {formatScore(
                                  item.submission
                                )}
                              </p>
                            </div>

                            {/* BUTTON */}

                            <Link
                              href={`/dashboard/student/exercises/${item.id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-green-300 bg-white px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
                            >
                              ✓ Đã nộp
                            </Link>
                          </>
                        ) : (
                          <Link
                            href={`/dashboard/student/exercises/${item.id}`}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            📝 Làm bài
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* ======================================
                        SUBMITTED INFORMATION
                    ======================================= */}

                    {isSubmitted &&
                      item.submission && (
                        <div className="mt-6 border-t border-green-100 pt-5">
                          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500">
                            <span>
                              ✓ Trạng thái:{' '}
                              <strong className="font-semibold text-green-600">
                                Đã nộp
                              </strong>
                            </span>

                            {item.submission
                              .submittedAt && (
                              <span>
                                🕐 Thời gian nộp:{' '}
                                <strong className="font-medium text-gray-700">
                                  {new Date(
                                    item.submission.submittedAt
                                  ).toLocaleString(
                                    'vi-VN'
                                  )}
                                </strong>
                              </span>
                            )}

                            {item.submission
                              .timeSpentSeconds !==
                              null && (
                              <span>
                                ⏱ Thời gian làm:{' '}
                                <strong className="font-medium text-gray-700">
                                  {Math.floor(
                                    item
                                      .submission
                                      .timeSpentSeconds /
                                      60
                                  )}{' '}
                                  phút{' '}
                                  {item
                                    .submission
                                    .timeSpentSeconds %
                                    60}{' '}
                                  giây
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </main>
    </div>
  );
}