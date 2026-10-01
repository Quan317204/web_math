'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import Link from 'next/link';
import TeacherPageHeader from '../../../TeacherPageHeader';



type ClassItem = {
  id: string;
  name: string;

  grades?: {
    name: string;
  } | null;

  _count?: {
    class_enrollments: number;
  };
};

type StudentItem = {
  id: string;
  full_name: string;
  email: string;

  class_id: string;
  class_name: string;
};

type Exercise = {
  id: string;
  title: string;
  question_count: number;
};

type Assignment = {
  id: string;

  created_at: string;

  start_date: string | null;

  due_date: string | null;

  class_id: string | null;

  student_id: string | null;

  classes?: {
    name: string;
  } | null;

  student?: {
    full_name: string;
    email: string;
  } | null;
};

type TargetType =
  | 'class'
  | 'student';

export default function AssignExercisePage() {
  const params = useParams();

  const router = useRouter();

  const exerciseId =
    params.id as string;

  // ==========================================
  // STATE
  // ==========================================

  const [exercise, setExercise] =
    useState<Exercise | null>(null);

  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [students, setStudents] =
    useState<StudentItem[]>([]);

  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [targetType, setTargetType] =
    useState<TargetType>('class');

  const [classId, setClassId] =
    useState('');

  const [studentId, setStudentId] =
    useState('');

  const [startDate, setStartDate] =
    useState('');

  const [dueDate, setDueDate] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    loadData();
  }, [exerciseId]);

  async function loadData() {
    try {
      setLoading(true);

      setError('');

      const response =
        await fetch(
          `/api/assignments?exerciseId=${exerciseId}`,
          {
            cache: 'no-store',
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Không thể tải dữ liệu giao bài.'
        );
      }

      setExercise(data.exercise || null);

      setClasses(
        Array.isArray(data.classes)
          ? data.classes
          : []
      );

      setStudents(
        Array.isArray(data.students)
          ? data.students
          : []
      );

      setAssignments(
        Array.isArray(data.assignments)
          ? data.assignments
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu.'
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // HỌC SINH THEO LỚP
  // ==========================================

  const studentsInSelectedClass =
    useMemo(() => {
      if (!classId) {
        return students;
      }

      return students.filter(
        (student) =>
          student.class_id === classId
      );
    }, [students, classId]);

  // ==========================================
  // THAY ĐỔI LOẠI ĐỐI TƯỢNG
  // ==========================================

  function handleTargetTypeChange(
    type: TargetType
  ) {
    setTargetType(type);

    setClassId('');

    setStudentId('');

    setError('');

    setMessage('');
  }

  // ==========================================
  // THAY ĐỔI LỚP
  // ==========================================

  function handleClassChange(
    value: string
  ) {
    setClassId(value);

    // Nếu đang chọn cá nhân thì
    // reset học sinh khi đổi lớp
    setStudentId('');
  }

  // ==========================================
  // SUBMIT
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage('');

    setError('');

    // -------------------------------
    // Kiểm tra đối tượng
    // -------------------------------

    if (targetType === 'class' && !classId) {
      setError(
        'Vui lòng chọn lớp.'
      );

      return;
    }

    if (
      targetType === 'student' &&
      !studentId
    ) {
      setError(
        'Vui lòng chọn học sinh.'
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          '/api/assignments',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              exerciseId,

              classId:
                targetType === 'class'
                  ? classId
                  : null,

              studentId:
                targetType === 'student'
                  ? studentId
                  : null,

              startDate: startDate
                ? new Date(
                    startDate
                  ).toISOString()
                : null,

              dueDate: dueDate
                ? new Date(
                    dueDate
                  ).toISOString()
                : null,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Không thể giao bài.'
        );
      }

      setMessage(
        data.message ||
          'Giao bài tập thành công!'
      );

      // Reset
      setClassId('');

      setStudentId('');

      setStartDate('');

      setDueDate('');

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Không thể giao bài.'
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // FORMAT DATE
  // ==========================================

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return '—';
    }

    return new Date(
      value
    ).toLocaleString('vi-VN');
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="p-8 text-center text-gray-500">
          Đang tải dữ liệu...
        </div>
      </main>
    );
  }

  // ==========================================
  // KHÔNG CÓ BÀI
  // ==========================================

  if (!exercise) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-600">
            Không tìm thấy bài tập.
          </p>

          <Link
            href="/dashboard/teacher/exercises"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Quay lại bài tập
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}

      <TeacherPageHeader
        title="Giao bài tập"
        description={exercise.title}
        action={
          <button
            type="button"
            onClick={() =>
              router.push(
                '/dashboard/teacher/exercises'
              )
            }
            className="rounded-lg border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← Quay lại
          </button>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* THÔNG TIN BÀI */}

        <section className="rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Thông tin bài tập
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Bài tập
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {exercise.title}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Số câu hỏi
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {exercise.question_count}
              </p>
            </div>

          </div>

        </section>

        {/* THÔNG BÁO */}

        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* FORM */}

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Đối tượng nhận bài
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Bạn có thể giao cho toàn bộ lớp hoặc một học sinh cụ thể.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* CHỌN ĐỐI TƯỢNG */}

            <div className="grid gap-4 md:grid-cols-2">

              {/* LỚP */}

              <button
                type="button"
                onClick={() =>
                  handleTargetTypeChange(
                    'class'
                  )
                }
                className={`rounded-xl border-2 p-5 text-left transition ${
                  targetType === 'class'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl">
                  🏫
                </div>

                <p className="mt-3 font-semibold text-gray-900">
                  Cả lớp
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Giao bài cho toàn bộ học sinh trong lớp.
                </p>
              </button>

              {/* CÁ NHÂN */}

              <button
                type="button"
                onClick={() =>
                  handleTargetTypeChange(
                    'student'
                  )
                }
                className={`rounded-xl border-2 p-5 text-left transition ${
                  targetType === 'student'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl">
                  👤
                </div>

                <p className="mt-3 font-semibold text-gray-900">
                  Một học sinh
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Chỉ giao bài cho một học sinh cụ thể.
                </p>
              </button>

            </div>

            {/* CHỌN LỚP */}

            {targetType === 'class' && (
              <div className="mt-6">

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Chọn lớp
                </label>

                <select
                  value={classId}
                  onChange={(event) =>
                    handleClassChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    -- Chọn lớp --
                  </option>

                  {classes.map(
                    (classItem) => (
                      <option
                        key={classItem.id}
                        value={classItem.id}
                      >
                        {classItem.name}

                        {classItem.grades?.name
                          ? ` - ${classItem.grades.name}`
                          : ''}

                        {classItem._count
                          ?.class_enrollments !==
                        undefined
                          ? ` (${classItem._count.class_enrollments} học sinh)`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                  Bài tập sẽ được giao cho toàn bộ học sinh trong lớp đã chọn.
                </div>

              </div>
            )}

            {/* CHỌN HỌC SINH */}

            {targetType === 'student' && (
              <div className="mt-6 space-y-5">

                {/* LỚP */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Chọn lớp
                  </label>

                  <select
                    value={classId}
                    onChange={(event) =>
                      handleClassChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="">
                      -- Chọn lớp trước --
                    </option>

                    {classes.map(
                      (classItem) => (
                        <option
                          key={classItem.id}
                          value={classItem.id}
                        >
                          {classItem.name}

                          {classItem.grades?.name
                            ? ` - ${classItem.grades.name}`
                            : ''}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* HỌC SINH */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Chọn học sinh
                  </label>

                  <select
                    value={studentId}
                    onChange={(event) =>
                      setStudentId(
                        event.target.value
                      )
                    }
                    disabled={!classId}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none disabled:bg-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="">
                      {!classId
                        ? '-- Hãy chọn lớp trước --'
                        : '-- Chọn học sinh --'}
                    </option>

                    {studentsInSelectedClass.map(
                      (student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.full_name}
                          {' - '}
                          {student.email}
                        </option>
                      )
                    )}
                  </select>

                  {classId &&
                    studentsInSelectedClass.length ===
                      0 && (
                      <p className="mt-2 text-sm text-orange-600">
                        Không tìm thấy học sinh đang hoạt động trong lớp này.
                      </p>
                    )}
                </div>

                {/* HỌC SINH ĐÃ CHỌN */}

                {studentId && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">

                    {(() => {
                      const student =
                        students.find(
                          (item) =>
                            item.id ===
                            studentId
                        );

                      if (!student) {
                        return null;
                      }

                      return (
                        <>
                          <p className="text-sm text-green-700">
                            Học sinh được chọn
                          </p>

                          <p className="mt-1 font-semibold text-green-900">
                            {student.full_name}
                          </p>

                          <p className="mt-1 text-sm text-green-700">
                            {student.email}
                          </p>
                        </>
                      );
                    })()}

                  </div>
                )}

              </div>
            )}

            {/* THỜI GIAN */}

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Thời gian bắt đầu
                </label>

                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Để trống nếu muốn bài có hiệu lực ngay lập tức.
                </p>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Hạn nộp
                </label>

                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Để trống nếu không giới hạn thời gian.
                </p>

              </div>

            </div>

            {/* BUTTON */}

            <div className="mt-8 flex justify-end">

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'Đang giao...'
                  : '✓ Giao bài tập'}
              </button>

            </div>

          </form>

        </section>

        {/* LỊCH SỬ */}

        <section className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">

          <div className="border-b px-6 py-5">

            <h2 className="text-lg font-semibold text-gray-900">
              Lịch sử giao bài
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Các lần giao bài tập này.
            </p>

          </div>

          {assignments.length === 0 ? (

            <div className="p-10 text-center">

              <div className="text-4xl">
                📤
              </div>

              <p className="mt-3 text-sm text-gray-500">
                Bài tập này chưa được giao.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="border-b bg-gray-50">

                  <tr className="text-xs uppercase text-gray-500">

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

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {assignments.map(
                    (assignment) => {

                      const isStudent =
                        !!assignment.student_id;

                      return (
                        <tr
                          key={
                            assignment.id
                          }
                          className="hover:bg-gray-50"
                        >

                          {/* GIAO CHO */}

                          <td className="px-6 py-4">

                            {isStudent ? (

                              <div>

                                <p className="font-semibold text-gray-900">
                                  {assignment
                                    .student
                                    ?.full_name ||
                                    'Học sinh'}
                                </p>

                                {assignment
                                  .student
                                  ?.email && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    {
                                      assignment
                                        .student
                                        .email
                                    }
                                  </p>
                                )}

                              </div>

                            ) : (

                              <p className="font-semibold text-gray-900">
                                {assignment
                                  .classes
                                  ?.name ||
                                  'Lớp'}
                              </p>

                            )}

                          </td>

                          {/* LOẠI */}

                          <td className="px-6 py-4">

                            {isStudent ? (

                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                Cá nhân
                              </span>

                            ) : (

                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                Cả lớp
                              </span>

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
                            {assignment.due_date
                              ? formatDate(
                                  assignment.due_date
                                )
                              : 'Không giới hạn'}
                          </td>

                          {/* NGÀY GIAO */}

                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(
                              assignment.created_at
                            )}
                          </td>

                        </tr>
                      );
                    }
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