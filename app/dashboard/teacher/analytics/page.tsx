'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Overview = {
  averageScore: number;
  completionRate: number;
  totalStudySeconds: number;
  progressChange: number;
  submissionCount: number;
  completedCount: number;
  assignedCount: number;
  studentCount: number;
};

type ClassAnalytics = {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  averageScore: number;
  completionRate: number;
};

type StudentAnalytics = {
  id: string;
  name: string;
  email: string;
  classNames: string[];
  averageScore: number;
  completionRate: number;
  studySeconds: number;
  submissionCount: number;
  progressChange: number | null;
  weakestTopic: { name: string; score: number } | null;
};

type WeakTopic = {
  id: string;
  name: string;
  averageScore: number;
  submissionCount: number;
  studentCount: number;
};

type Recommendation = {
  id: string;
  title: string;
  summary: string | null;
  topicId: string;
  topicName: string;
  topicAverageScore: number;
  studentsNeedingLesson: number;
};

type AnalyticsData = {
  overview: Overview;
  classes: ClassAnalytics[];
  students: StudentAnalytics[];
  weakTopics: WeakTopic[];
  recommendations: Recommendation[];
  message?: string;
};

const EMPTY_OVERVIEW: Overview = {
  averageScore: 0,
  completionRate: 0,
  totalStudySeconds: 0,
  progressChange: 0,
  submissionCount: 0,
  completedCount: 0,
  assignedCount: 0,
  studentCount: 0,
};

function formatDuration(seconds: number) {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} phút`;
  return `${hours} giờ ${minutes} phút`;
}

function formatScore(score: number) {
  return `${Number(score || 0).toFixed(1)}%`;
}

function ProgressBar({
  value,
  color = 'bg-blue-600',
}: {
  value: number;
  color?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default function TeacherAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async (selectedClassId: string) => {
    setLoading(true);
    setError('');

    try {
      const query = selectedClassId
        ? `?classId=${encodeURIComponent(selectedClassId)}`
        : '';

      const response = await fetch(
        `/api/teachers/analytics${query}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Không thể tải dữ liệu phân tích.',
        );
      }

      setData(result as AnalyticsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi tải dữ liệu.',
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(classId);
  }, [classId, loadAnalytics]);

  const overview = data?.overview ?? EMPTY_OVERVIEW;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard/teacher"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Quay lại trang giáo viên
            </Link>

            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              Learning Analytics
            </h1>

            <p className="mt-2 text-gray-600">
              Phân tích kết quả và theo dõi tiến bộ học tập của học sinh.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="min-w-48 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              aria-label="Lọc theo lớp học"
            >
              <option value="">Tất cả lớp học</option>
              {(data?.classes ?? []).map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name} — {schoolClass.grade}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadAnalytics(classId)}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
            Đang tải dữ liệu Learning Analytics...
          </div>
        ) : data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Điểm trung bình"
                value={formatScore(overview.averageScore)}
                description={`${overview.submissionCount} lượt làm bài được ghi nhận`}
              />

              <StatCard
                title="Tỷ lệ hoàn thành"
                value={formatScore(overview.completionRate)}
                description={`${overview.completedCount}/${overview.assignedCount} lượt bài giao đã hoàn thành`}
              />

              <StatCard
                title="Tổng thời gian làm bài"
                value={formatDuration(overview.totalStudySeconds)}
                description="Tổng thời gian đã lưu trong các bài nộp"
              />

              <StatCard
                title="Mức độ tiến bộ"
                value={
                  overview.progressChange > 0
                    ? `+${overview.progressChange} điểm %`
                    : `${overview.progressChange} điểm %`
                }
                description="So sánh 30 ngày gần đây với 30 ngày trước đó"
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-gray-900">
                    Thống kê theo lớp
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    So sánh điểm và tỷ lệ hoàn thành của từng lớp.
                  </p>
                </div>

                {data.classes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Chưa có lớp học để thống kê.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {data.classes.map((schoolClass) => (
                      <div key={schoolClass.id}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {schoolClass.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {schoolClass.grade} · {schoolClass.studentCount}{' '}
                              học sinh
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-gray-800">
                            {formatScore(schoolClass.averageScore)}
                          </p>
                        </div>

                        <ProgressBar value={schoolClass.averageScore} />

                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>Tỷ lệ hoàn thành</span>
                          <span>
                            {formatScore(schoolClass.completionRate)}
                          </span>
                        </div>

                        <ProgressBar
                          value={schoolClass.completionRate}
                          color="bg-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">
                  Chủ đề học sinh còn yếu
                </h2>
                <p className="mb-5 mt-1 text-sm text-gray-500">
                  Các chủ đề có điểm trung bình dưới 70%.
                </p>

                {data.weakTopics.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-600">
                    Chưa phát hiện chủ đề yếu từ dữ liệu bài nộp hiện có.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {data.weakTopics.map((topic) => (
                      <div key={topic.id}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {topic.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {topic.studentCount} học sinh ·{' '}
                              {topic.submissionCount} bài có điểm
                            </p>
                          </div>
                          <span className="font-bold text-red-600">
                            {formatScore(topic.averageScore)}
                          </span>
                        </div>

                        <ProgressBar
                          value={topic.averageScore}
                          color="bg-red-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Đề xuất bài học tiếp theo
              </h2>
              <p className="mb-5 mt-1 text-sm text-gray-500">
                Ưu tiên bài học thuộc chủ đề điểm thấp mà học sinh chưa hoàn
                thành.
              </p>

              {data.recommendations.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-600">
                  Chưa có đề xuất phù hợp. Hãy kiểm tra dữ liệu chủ đề, bài học
                  và tiến độ học tập.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {data.recommendations.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {lesson.title}
                          </p>
                          <p className="mt-1 text-sm text-blue-700">
                            Chủ đề: {lesson.topicName}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Ưu tiên
                        </span>
                      </div>

                      {lesson.summary && (
                        <p className="mt-3 text-sm leading-6 text-gray-600">
                          {lesson.summary}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-red-50 px-2.5 py-1.5 text-red-700">
                          Điểm chủ đề:{' '}
                          {formatScore(lesson.topicAverageScore)}
                        </span>
                        <span className="rounded-md bg-blue-50 px-2.5 py-1.5 text-blue-700">
                          {lesson.studentsNeedingLesson} học sinh cần học
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-5">
                <h2 className="text-lg font-bold text-gray-900">
                  Phân tích theo học sinh
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {data.students.length} học sinh trong phạm vi lớp đang xem.
                </p>
              </div>

              {data.students.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">
                  Chưa có học sinh trong lớp được chọn.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-4">Học sinh</th>
                        <th className="px-5 py-4">Lớp</th>
                        <th className="px-5 py-4">Điểm TB</th>
                        <th className="px-5 py-4">Hoàn thành</th>
                        <th className="px-5 py-4">Thời gian làm bài</th>
                        <th className="px-5 py-4">Tiến bộ</th>
                        <th className="px-5 py-4">Chủ đề yếu nhất</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {data.students.map((student) => (
                        <tr
                          key={student.id}
                          className="align-top hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900">
                              {student.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {student.email}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {student.classNames.join(', ') || '—'}
                          </td>

                          <td className="px-5 py-4 font-semibold text-gray-900">
                            {formatScore(student.averageScore)}
                          </td>

                          <td className="px-5 py-4">
                            {formatScore(student.completionRate)}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {formatDuration(student.studySeconds)}
                          </td>

                          <td className="px-5 py-4">
                            {student.progressChange === null ? (
                              <span className="text-gray-400">
                                Chưa đủ dữ liệu
                              </span>
                            ) : (
                              <span
                                className={
                                  student.progressChange > 0
                                    ? 'font-semibold text-emerald-600'
                                    : student.progressChange < 0
                                      ? 'font-semibold text-red-600'
                                      : 'text-gray-600'
                                }
                              >
                                {student.progressChange > 0 ? '+' : ''}
                                {student.progressChange} điểm %
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {student.weakestTopic ? (
                              <div>
                                <p className="font-medium text-gray-800">
                                  {student.weakestTopic.name}
                                </p>
                                <p className="mt-1 text-xs text-red-600">
                                  {formatScore(student.weakestTopic.score)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400">
                                Chưa có dữ liệu
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <p className="text-xs leading-5 text-gray-500">
              Các chỉ số được tính từ dữ liệu hiện có. Mức độ tiến bộ chỉ được
              so sánh khi có điểm ở cả hai giai đoạn 30 ngày. Tỷ lệ hoàn thành
              dựa trên bài giao và bài nộp được liên kết với bài giao.
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
