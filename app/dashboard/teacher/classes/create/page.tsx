'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Grade = {
  id: string;
  name: string;
  level_order: number;
};

export default function CreateClassPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [gradeId, setGradeId] = useState('');

  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadGrades();
  }, []);

  async function loadGrades() {
    try {
      setLoadingGrades(true);

      const response = await fetch('/api/grades');

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Không thể tải danh sách khối'
        );
      }

      setGrades(result.data || []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách khối'
      );
    } finally {
      setLoadingGrades(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Vui lòng nhập tên lớp.');
      return;
    }

    if (!gradeId) {
      setError('Vui lòng chọn khối.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/teachers/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          gradeId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Không thể tạo lớp học'
        );
      }

      setSuccess('Tạo lớp học thành công.');

      // Chuyển về danh sách lớp sau một khoảng ngắn
      setTimeout(() => {
        router.push('/dashboard/teacher/classes');
        router.refresh();
      }, 500);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tạo lớp học'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">

        {/* Quay lại */}
        <Link
          href="/dashboard/teacher/classes"
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          ← Quay lại quản lý lớp
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-5">
            <h1 className="text-2xl font-bold text-slate-900">
              Tạo lớp học
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Tạo một lớp học mới để quản lý học sinh và hoạt động học tập.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6 p-6"
          >
            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* Tên lớp */}
            <div>
              <label
                htmlFor="class-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Tên lớp
              </label>

              <input
                id="class-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ví dụ: Toán 6A"
                maxLength={100}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Tối đa 100 ký tự.
              </p>
            </div>

            {/* Khối */}
            <div>
              <label
                htmlFor="grade"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Khối
              </label>

              <select
                id="grade"
                value={gradeId}
                onChange={(event) =>
                  setGradeId(event.target.value)
                }
                disabled={
                  submitting || loadingGrades
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">
                  {loadingGrades
                    ? 'Đang tải danh sách khối...'
                    : 'Chọn khối'}
                </option>

                {grades.map((grade) => (
                  <option
                    key={grade.id}
                    value={grade.id}
                  >
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/teacher/classes"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </Link>

              <button
                type="submit"
                disabled={submitting || loadingGrades}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? 'Đang tạo...'
                  : 'Tạo lớp học'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}