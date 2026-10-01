'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Submission = {
  id: string;

  student: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };

  exercise: {
    id: string;
    title: string;
  };

  assignment: {
    id: string;
    className: string | null;
    groupName: string | null;
  } | null;

  status: string;

  totalScore: number | null;
  maxScore: number | null;

  timeSpentSeconds: number | null;

  startedAt: string;
  submittedAt: string | null;
};

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        '/api/teachers/submissions',
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
            'Không thể tải danh sách bài nộp'
        );
      }

      setSubmissions(
        data.submissions || []
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách bài nộp'
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return '—';
    }

    return new Date(
      value
    ).toLocaleString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  function formatTime(
    seconds: number | null
  ) {
    if (
      seconds === null ||
      seconds === undefined
    ) {
      return '—';
    }

    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    if (minutes === 0) {
      return `${remainingSeconds} giây`;
    }

    return `${minutes} phút ${remainingSeconds} giây`;
  }

  function getScoreText(
    submission: Submission
  ) {
    if (
      submission.totalScore === null ||
      submission.maxScore === null
    ) {
      return 'Chưa chấm';
    }

    return `${submission.totalScore} / ${submission.maxScore}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/dashboard/teacher"
              className="text-sm text-gray-500 hover:text-blue-600"
            >
              ← Teacher Portal
            </Link>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Bài học sinh đã nộp
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Theo dõi các bài tập học sinh đã hoàn thành
            </p>
          </div>

          <button
            onClick={loadSubmissions}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ↻ Làm mới
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Statistics */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Tổng bài đã nộp
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {submissions.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Bài đã chấm
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {
                submissions.filter(
                  (item) =>
                    item.status ===
                    'graded'
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Chờ xem / chấm
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-500">
              {
                submissions.filter(
                  (item) =>
                    item.status ===
                    'submitted'
                ).length
              }
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">
              Không thể tải dữ liệu
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <p className="mt-4 text-gray-500">
              Đang tải danh sách bài nộp...
            </p>
          </div>
        ) : submissions.length === 0 ? (
          /* Empty */
          <div className="rounded-xl border bg-white p-12 text-center">
            <div className="text-5xl">
              📭
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Chưa có bài nộp
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Khi học sinh nộp các bài tập do bạn tạo,
              bài làm sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          /* Table */
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Học sinh
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Bài tập
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lớp / Nhóm
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Điểm
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Thời gian
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nộp lúc
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Trạng thái
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {submissions.map(
                    (submission) => (
                      <tr
                        key={
                          submission.id
                        }
                        className="hover:bg-gray-50"
                      >
                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {submission
                              .student
                              .avatarUrl ? (
                              <img
                                src={
                                  submission
                                    .student
                                    .avatarUrl
                                }
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                                {submission.student.fullName
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  '?'}
                              </div>
                            )}

                            <div>
                              <p className="font-medium text-gray-900">
                                {
                                  submission
                                    .student
                                    .fullName
                                }
                              </p>

                              <p className="text-xs text-gray-500">
                                {
                                  submission
                                    .student
                                    .email
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Exercise */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {
                              submission
                                .exercise
                                .title
                            }
                          </p>
                        </td>

                        {/* Class / group */}
                        <td className="px-5 py-4">
                          {submission
                            .assignment
                            ?.className ? (
                            <p className="text-sm text-gray-700">
                              {
                                submission
                                  .assignment
                                  .className
                              }
                            </p>
                          ) : null}

                          {submission
                            .assignment
                            ?.groupName ? (
                            <p className="text-xs text-gray-500">
                              Nhóm:{' '}
                              {
                                submission
                                  .assignment
                                  .groupName
                              }
                            </p>
                          ) : null}

                          {!submission
                            .assignment
                            ?.className &&
                            !submission
                              .assignment
                              ?.groupName && (
                              <span className="text-sm text-gray-400">
                                Cá nhân
                              </span>
                            )}
                        </td>

                        {/* Score */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-900">
                            {getScoreText(
                              submission
                            )}
                          </span>
                        </td>

                        {/* Time */}
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {formatTime(
                            submission.timeSpentSeconds
                          )}
                        </td>

                        {/* Submitted at */}
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {formatDate(
                            submission.submittedAt
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {submission.status ===
                          'graded' ? (
                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Đã chấm
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                              Đã nộp
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/teacher/submissions/${submission.id}`}
                            className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Xem bài
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
