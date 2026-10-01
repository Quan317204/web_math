'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type ClassData = {
  id: string;
  name: string;
  grade_id: string;
  grade_name?: string | null;
};

type Grade = {
  id: string;
  name: string;
};

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();

  const classId = String(params.id);

  const [classData, setClassData] =
    useState<ClassData | null>(null);

  const [grades, setGrades] =
    useState<Grade[]>([]);

  const [name, setName] = useState('');
  const [gradeId, setGradeId] = useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [classResponse, gradesResponse] =
        await Promise.all([
          fetch(
            `/api/teachers/classes/${classId}`,
            {
              cache: 'no-store',
            }
          ),
          fetch('/api/grades', {
            cache: 'no-store',
          }),
        ]);

      const classResult =
        await classResponse.json();

      if (!classResponse.ok) {
        throw new Error(
          classResult.error ||
            'Không thể tải thông tin lớp'
        );
      }

      const gradesResult =
        await gradesResponse.json();

      if (!gradesResponse.ok) {
        throw new Error(
          gradesResult.error ||
            'Không thể tải danh sách khối lớp'
        );
      }

      const data =
        classResult.data || classResult.class;

      if (!data) {
        throw new Error(
          'Không tìm thấy dữ liệu lớp học'
        );
      }

      setClassData(data);

      setName(data.name || '');
      setGradeId(data.grade_id || '');

      setGrades(
        gradesResult.data ||
          gradesResult.grades ||
          []
      );
    } catch (err) {
      console.error(
        'load edit class:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setError('Vui lòng nhập tên lớp');
      return;
    }

    if (!gradeId) {
      setError('Vui lòng chọn khối lớp');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch(
        `/api/teachers/classes/${classId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            grade_id: gradeId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Không thể cập nhật lớp'
        );
      }

      router.push(
        `/dashboard/teacher/classes/${classId}`
      );

      router.refresh();
    } catch (err) {
      console.error(
        'update class:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật lớp'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Đang tải thông tin lớp...
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error ||
            'Không tìm thấy lớp học'}
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              '/dashboard/teacher'
            )
          }
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-white"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/teacher/classes/${classId}`
            )
          }
          className="mb-6 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Quay lại lớp học
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Chỉnh sửa lớp học
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Cập nhật thông tin lớp học
          </p>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tên lớp
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ví dụ: Toán 8A1"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Khối lớp
              </label>

              <select
                value={gradeId}
                onChange={(event) =>
                  setGradeId(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                disabled={saving}
              >
                <option value="">
                  -- Chọn khối lớp --
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/teacher/classes/${classId}`
                  )
                }
                disabled={saving}
                className="rounded-lg border border-gray-300 px-5 py-3 text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? 'Đang lưu...'
                  : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}