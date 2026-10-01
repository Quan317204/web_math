'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TeacherPageHeader from '../TeacherPageHeader';

type ClassItem = {
  id: string;
  name: string;
  grade_id: string;
  created_at: string;

  grades: {
    id: string;
    name: string;
    level_order: number;
  };

  _count: {
    class_enrollments: number;
  };
};

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function loadClasses() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/teachers/classes');

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Không thể tải danh sách lớp'
        );
      }

      setClasses(result.data || []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, []);

  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return classes;
    }

    return classes.filter((item) =>
      item.name.toLowerCase().includes(keyword)
    );
  }, [classes, search]);

  async function deleteClass(id: string) {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa lớp này không?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/teacher/classes/${id}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Không thể xóa lớp'
        );
      }

      await loadClasses();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Không thể xóa lớp'
      );
    }
  }

    return (
    <div className="min-h-screen bg-gray-50">
        <TeacherPageHeader
        title="Quản lý lớp học"
        description="Tạo, chỉnh sửa và quản lý các lớp học của bạn."
        action={
            <Link
            href="/dashboard/teacher/classes/create"
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
            + Tạo lớp học
            </Link>
        }
        />

        <main className="mx-auto max-w-7xl px-6 py-8">

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Tìm kiếm lớp học..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* CONTENT */}
        {/* ================================================= */}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500 shadow-sm">
            Đang tải danh sách lớp...
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-5xl">📚</div>

            <h2 className="mt-4 text-xl font-bold text-slate-800">
              Chưa có lớp học
            </h2>

            <p className="mt-2 text-slate-500">
              Hãy tạo lớp học đầu tiên của bạn.
            </p>

            <Link
              href="/dashboard/teacher/classes/create"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Tạo lớp học
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredClasses.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {item.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.grades.name}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    {item._count.class_enrollments} HS
                  </div>
                </div>

                <div className="mt-6 text-sm text-slate-500">
                  Tạo ngày:{' '}
                  {new Date(
                    item.created_at
                  ).toLocaleDateString('vi-VN')}
                </div>

                <div className="mt-6 flex gap-2">
                  <Link
                    href={`/dashboard/teacher/classes/${item.id}`}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-700"
                  >
                    Xem lớp
                  </Link>

                  <Link
                    href={`/dashboard/teacher/classes/${item.id}/edit`}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Sửa
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      deleteClass(item.id)
                    }
                    className="rounded-xl border border-red-200 px-4 py-2.5 font-semibold text-red-600 hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
         </main>
      </div>
  );
}
