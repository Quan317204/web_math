'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import TeacherPageHeader from '../TeacherPageHeader';

type Assignment = {
  id: string;
  exercise_id: string;

  class_id?: string | null;
  group_id?: string | null;
  student_id?: string | null;

  start_date?: string | null;
  due_date?: string | null;
  created_at: string;

  exercise?: {
    id: string;
    title: string;
  } | null;

  class?: {
    id: string;
    name: string;
  } | null;

  group?: {
    id: string;
    name: string;
  } | null;

  student?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
};

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function loadAssignments() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/assignments', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Không thể tải danh sách giao bài'
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.assignments)
          ? data.assignments
          : Array.isArray(data.data)
            ? data.data
            : [];

      setAssignments(list);
    } catch (error) {
      console.error(error);

      setAssignments([]);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách giao bài'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  /*
   * Tìm kiếm
   */
  const filteredAssignments = assignments.filter(
    (assignment) => {
      const keyword = search.toLowerCase().trim();

      if (!keyword) {
        return true;
      }

      const exerciseName =
        assignment.exercise?.title?.toLowerCase() || '';

      const className =
        assignment.class?.name?.toLowerCase() || '';

      const groupName =
        assignment.group?.name?.toLowerCase() || '';

      const studentName =
        assignment.student?.full_name?.toLowerCase() || '';

      const studentEmail =
        assignment.student?.email?.toLowerCase() || '';

      return (
        exerciseName.includes(keyword) ||
        className.includes(keyword) ||
        groupName.includes(keyword) ||
        studentName.includes(keyword) ||
        studentEmail.includes(keyword)
      );
    }
  );

  /*
   * Xác định tên người/lớp được giao
   */
  function getTargetName(assignment: Assignment) {
    /*
     * Giao cho lớp
     */
    if (assignment.class_id) {
      return (
        assignment.class?.name ||
        'Chưa có tên lớp'
      );
    }

    /*
     * Giao cho nhóm
     */
    if (assignment.group_id) {
      return (
        assignment.group?.name ||
        'Chưa có tên nhóm'
      );
    }

    /*
     * Giao cho một học sinh
     */
    if (assignment.student_id) {
      return (
        assignment.student?.full_name ||
        assignment.student?.email ||
        'Chưa có tên học sinh'
      );
    }

    return 'Chưa xác định';
  }

  /*
   * Loại đối tượng
   */
  function getTargetType(
    assignment: Assignment
  ) {
    if (assignment.class_id) {
      return (
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Lớp
        </span>
      );
    }

    if (assignment.group_id) {
      return (
        <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
          Nhóm
        </span>
      );
    }

    if (assignment.student_id) {
      return (
        <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          Học sinh
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
        Không xác định
      </span>
    );
  }

  /*
   * Format ngày giờ
   */
  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleString(
      'vi-VN',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <TeacherPageHeader
        title="Quản lý giao bài"
        description="Theo dõi và quản lý các bài tập đã giao cho học sinh"
        action={
          <Link
            href="/dashboard/teacher/exercises"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Tạo và giao bài
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* THỐNG KÊ */}
        <div className="grid gap-5 md:grid-cols-3">

          {/* Tổng */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Tổng bài đã giao
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {assignments.length}
            </p>
          </div>

          {/* Lớp */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Giao cho lớp
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {
                assignments.filter(
                  (item) => !!item.class_id
                ).length
              }
            </p>
          </div>

          {/* Cá nhân */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Giao cá nhân
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {
                assignments.filter(
                  (item) => !!item.student_id
                ).length
              }
            </p>
          </div>

        </div>

        {/* TÌM KIẾM */}
        <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
          <div className="relative">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Tìm theo bài tập, lớp, nhóm hoặc học sinh..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>

          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">
              Không thể tải dữ liệu
            </p>

            <p className="mt-1">
              {error}
            </p>

            <button
              onClick={loadAssignments}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* DANH SÁCH */}
        <section className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">

          {/* TITLE */}
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Danh sách giao bài
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Các bài tập đã được giao cho lớp, nhóm hoặc học sinh.
            </p>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="text-sm text-gray-500">
                Đang tải danh sách giao bài...
              </div>
            </div>
          ) : filteredAssignments.length === 0 ? (

            /* EMPTY */
            <div className="p-12 text-center">

              <div className="text-5xl">
                📤
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">
                {search
                  ? 'Không tìm thấy kết quả'
                  : 'Chưa có bài được giao'}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {search
                  ? 'Thử thay đổi từ khóa tìm kiếm.'
                  : 'Hãy chọn một bài tập để giao cho học sinh.'}
              </p>

              {!search && (
                <Link
                  href="/dashboard/teacher/exercises"
                  className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Xem bài tập
                </Link>
              )}

            </div>
          ) : (

            /* TABLE */
            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="border-b bg-gray-50">
                  <tr className="text-xs uppercase text-gray-500">

                    <th className="px-6 py-4">
                      Bài tập
                    </th>

                    <th className="px-6 py-4">
                      Giao cho
                    </th>

                    <th className="px-6 py-4">
                      Loại
                    </th>

                    <th className="px-6 py-4">
                      Bắt đầu
                    </th>

                    <th className="px-6 py-4">
                      Hạn nộp
                    </th>

                    <th className="px-6 py-4">
                      Ngày giao
                    </th>

                    <th className="px-6 py-4 text-right">
                      Thao tác
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y">

                  {filteredAssignments.map(
                    (assignment) => (
                      <tr
                        key={assignment.id}
                        className="transition hover:bg-gray-50"
                      >

                        {/* BÀI TẬP */}
                        <td className="px-6 py-4">

                          <p className="font-medium text-gray-900">
                            {assignment.exercise?.title ||
                              'Bài tập'}
                          </p>

                        </td>

                        {/* GIAO CHO */}
                        <td className="px-6 py-4">

                          <div>

                            <p className="font-semibold text-gray-900">
                              {getTargetName(
                                assignment
                              )}
                            </p>

                            {/* Email học sinh */}
                            {assignment.student_id &&
                              assignment.student?.email && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {
                                    assignment.student
                                      .email
                                  }
                                </p>
                              )}

                          </div>

                        </td>

                        {/* LOẠI */}
                        <td className="px-6 py-4">
                          {getTargetType(
                            assignment
                          )}
                        </td>

                        {/* BẮT ĐẦU */}
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(
                            assignment.start_date
                          )}
                        </td>

                        {/* HẠN */}
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(
                            assignment.due_date
                          )}
                        </td>

                        {/* NGÀY GIAO */}
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(
                            assignment.created_at
                          )}
                        </td>

                        {/* THAO TÁC */}
                        <td className="px-6 py-4 text-right">

                          <Link
                            href={`/dashboard/teacher/exercises/${assignment.exercise_id}/assign`}
                            className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            Quản lý
                          </Link>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>
    </div>
  );
}