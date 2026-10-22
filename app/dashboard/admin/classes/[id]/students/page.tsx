'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type ClassInfo = {
  id: string;
  name: string;
  grade_id: string;
  grades: {
    id: string;
    name: string;
  } | null;
};

type Student = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
};

type StudentsResponse = {
  class: ClassInfo;
  data: Student[];
  total: number;
  message?: string;
};

export default function AdminClassStudentsPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);

  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudents = useCallback(
    async (searchText: string, signal?: AbortSignal) => {
      if (!classId) return;

      setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams();

        if (searchText.trim()) {
          query.set('q', searchText.trim());
        }

        const suffix = query.toString();
        const url = `/api/admin/classes/${encodeURIComponent(classId)}/students${
          suffix ? `?${suffix}` : ''
        }`;

        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          signal,
        });

        const result = (await response.json()) as StudentsResponse;

        if (!response.ok) {
          throw new Error(
            result.message ?? 'Không thể tải danh sách học sinh.',
          );
        }

        setClassInfo(result.class);
        setStudents(result.data ?? []);
        setTotal(result.total ?? 0);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Đã xảy ra lỗi khi tải dữ liệu.',
        );

        setStudents([]);
        setTotal(0);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [classId],
  );

  // Tải dữ liệu và tìm kiếm sau khi người dùng ngừng nhập.
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      void loadStudents(keyword, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword, loadStudents]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Điều hướng */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/admin/classes"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <span aria-hidden="true">←</span>
            Quay lại danh sách lớp
          </Link>

          <button
            type="button"
            onClick={() => void loadStudents(keyword)}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* Thông tin lớp */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          {classInfo ? (
            <>
              <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
                Quản lý lớp học
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                {classInfo.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Khối lớp: {classInfo.grades?.name ?? 'Chưa xác định'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">Thông tin lớp học</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                Danh sách học sinh
              </h1>
            </>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                Số học sinh tìm thấy
              </p>
              <p className="mt-1 text-3xl font-bold text-blue-900">
                {total}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-600">
                Trạng thái dữ liệu
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {loading ? 'Đang tải dữ liệu...' : 'Đã cập nhật'}
              </p>
            </div>
          </div>
        </section>

        {/* Tìm kiếm */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="student-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tìm học sinh
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="student-search"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Nhập họ tên hoặc email học sinh..."
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        </section>

        {/* Danh sách học sinh */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              Học sinh trong lớp
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Danh sách tài khoản học sinh đã được ghi danh vào lớp này.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Đang tải danh sách học sinh...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Vui lòng kiểm tra kết nối rồi nhấn “Làm mới”.
            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl" aria-hidden="true">
                👨‍🎓
              </div>

              <p className="mt-3 font-semibold text-slate-800">
                {keyword
                  ? 'Không tìm thấy học sinh phù hợp'
                  : 'Lớp học chưa có học sinh'}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {keyword
                  ? 'Hãy thử tìm bằng tên hoặc email khác.'
                  : 'Danh sách sẽ hiển thị khi có học sinh được thêm vào lớp.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-semibold">Học sinh</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Số điện thoại</th>
                    <th className="px-5 py-4 font-semibold">Mã tài khoản</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {(student.full_name || 'H')
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span className="font-medium text-slate-900">
                            {student.full_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {student.email || 'Chưa cập nhật'}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {student.phone || 'Chưa cập nhật'}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {student.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && students.length > 0 && (
            <div className="border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
              Hiển thị {students.length} học sinh.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
