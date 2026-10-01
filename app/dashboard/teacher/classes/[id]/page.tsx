'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface StudentProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  grade_id?: string | null;
  grade_name?: string | null;
}

interface Enrollment {
  id: string;
  enrollment_id: string;
  student_id: string;
  status: string;
  joined_at?: string | null;
  student_profiles: StudentProfile;
}

interface StudentOption {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  grade_id?: string | null;
  grade_name?: string | null;
  level_order?: number | null;
}

interface ClassData {
  id: string;
  name: string;
  grade_id?: string | null;
  grade_name?: string | null;
}

export default function TeacherClassDetailPage() {
  const params = useParams();
  const router = useRouter();

  const classId = String(params.id);

  const [classData, setClassData] = useState<ClassData | null>(null);

  const [students, setStudents] = useState<Enrollment[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAvailableStudents, setLoadingAvailableStudents] =
    useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [currentStudentSearch, setCurrentStudentSearch] = useState('');

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [showStudentResults, setShowStudentResults] = useState(false);

  const [addingStudents, setAddingStudents] = useState(false);

  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // =========================================================
  // LOAD CLASS
  // =========================================================

  const loadClass = async () => {
    try {
      const response = await fetch(`/api/teachers/classes/${classId}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể tải thông tin lớp');
      }

      setClassData(data.data || data.class || null);
    } catch (error) {
      console.error('loadClass:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải thông tin lớp học',
      );
    }
  };

  // =========================================================
  // LOAD STUDENTS IN CLASS
  // =========================================================

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);

      const response = await fetch(
        `/api/teachers/classes/${classId}/students`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể tải danh sách học sinh');
      }

      setStudents(data.data || data.students || []);
    } catch (error) {
      console.error('loadStudents:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách học sinh',
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  // =========================================================
  // LOAD AVAILABLE STUDENTS
  // =========================================================

  const loadAvailableStudents = async () => {
    try {
      setLoadingAvailableStudents(true);

      const response = await fetch('/api/teachers/students/available');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'Không thể tải danh sách học sinh',
        );
      }

      setAvailableStudents(data.data || []);
    } catch (error) {
      console.error('loadAvailableStudents:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách học sinh',
      );
    } finally {
      setLoadingAvailableStudents(false);
    }
  };

  // =========================================================
  // LOAD ALL
  // =========================================================

  const loadData = async () => {
    setLoading(true);
    setError('');

    await Promise.all([
      loadClass(),
      loadStudents(),
      loadAvailableStudents(),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  // =========================================================
  // CURRENT STUDENTS
  // =========================================================

  const filteredCurrentStudents = useMemo(() => {
    const keyword = currentStudentSearch.trim().toLowerCase();

    if (!keyword) {
      return students;
    }

    return students.filter((enrollment) => {
      const student = enrollment.student_profiles;

      if (!student) {
        return false;
      }

      return (
        student.full_name?.toLowerCase().includes(keyword) ||
        student.email?.toLowerCase().includes(keyword) ||
        student.phone?.toLowerCase().includes(keyword) ||
        student.grade_name?.toLowerCase().includes(keyword)
      );
    });
  }, [students, currentStudentSearch]);

  // =========================================================
  // AVAILABLE STUDENTS
  // =========================================================

  const enrolledStudentIds = useMemo(() => {
    return new Set(students.map((student) => student.student_id));
  }, [students]);

  const filteredAvailableStudents = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();

    if (!keyword) {
      return [];
    }

    return availableStudents.filter((student) => {
      if (enrolledStudentIds.has(student.user_id)) {
        return false;
      }

      return (
        student.full_name?.toLowerCase().includes(keyword) ||
        student.email?.toLowerCase().includes(keyword) ||
        student.phone?.toLowerCase().includes(keyword)
      );
    });
  }, [
    availableStudents,
    enrolledStudentIds,
    studentSearch,
  ]);

  // =========================================================
  // SELECT STUDENT
  // =========================================================

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId);
      }

      return [...current, studentId];
    });
  };

  // =========================================================
  // SELECT ALL
  // =========================================================

  const allFilteredSelected =
    filteredAvailableStudents.length > 0 &&
    filteredAvailableStudents.every((student) =>
      selectedStudents.includes(student.user_id),
    );

  const toggleSelectAll = () => {
    const ids = filteredAvailableStudents.map(
      (student) => student.user_id,
    );

    if (allFilteredSelected) {
      setSelectedStudents((current) =>
        current.filter((id) => !ids.includes(id)),
      );
    } else {
      setSelectedStudents((current) => [
        ...new Set([...current, ...ids]),
      ]);
    }
  };

  // =========================================================
  // ADD STUDENTS
  // =========================================================

  const addStudents = async () => {
    if (selectedStudents.length === 0) {
      setError('Vui lòng chọn ít nhất một học sinh');
      return;
    }

    try {
      setAddingStudents(true);
      setError('');
      setSuccess('');

      const response = await fetch(
        `/api/teachers/classes/${classId}/students`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentIds: selectedStudents,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            'Không thể thêm học sinh vào lớp',
        );
      }

      setSuccess(
        data.message || 'Đã thêm học sinh vào lớp thành công',
      );

      setSelectedStudents([]);
      setStudentSearch('');
      setShowStudentResults(false);

      await Promise.all([
        loadStudents(),
        loadAvailableStudents(),
      ]);
    } catch (error) {
      console.error('addStudents:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể thêm học sinh vào lớp',
      );
    } finally {
      setAddingStudents(false);
    }
  };

  // =========================================================
  // REMOVE STUDENT
  // =========================================================

  const removeStudent = async (studentId: string) => {
    const student = students.find(
      (item) => item.student_id === studentId,
    );

    const studentName =
      student?.student_profiles?.full_name || 'học sinh này';

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa ${studentName} khỏi lớp không?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingStudentId(studentId);
      setError('');
      setSuccess('');

      const response = await fetch(
        `/api/teachers/classes/${classId}/students`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            'Không thể xóa học sinh khỏi lớp',
        );
      }

      setSuccess(data.message || 'Đã xóa học sinh khỏi lớp');

      await Promise.all([
        loadStudents(),
        loadAvailableStudents(),
      ]);
    } catch (error) {
      console.error('removeStudent:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Không thể xóa học sinh khỏi lớp',
      );
    } finally {
      setRemovingStudentId(null);
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date?: string | null) => {
    if (!date) {
      return '—';
    }

    try {
      return new Date(date).toLocaleDateString('vi-VN');
    } catch {
      return '—';
    }
  };

  // =========================================================
  // AVATAR
  // =========================================================

  const getInitial = (name?: string) => {
    if (!name) {
      return '?';
    }

    return name.trim().charAt(0).toUpperCase();
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="text-gray-600">
            Đang tải thông tin lớp học...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/teacher/classes')}
              className="mb-2 text-sm text-gray-500 hover:text-blue-600"
            >
              ← Quay lại danh sách lớp
            </button>

            <h1 className="text-2xl font-bold text-gray-900">
              {classData?.name || 'Chi tiết lớp học'}
            </h1>

            {classData?.grade_name && (
              <p className="mt-1 text-sm text-gray-500">
                Khối: {classData.grade_name}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={loadData}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ↻ Làm mới
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError('')}
              className="ml-4 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess('')}
              className="ml-4 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* ================================================= */}
        {/* TOP STATS */}
        {/* ================================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Tổng số học sinh
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {students.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Đang hiển thị
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {filteredCurrentStudents.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Đang chọn để thêm
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {selectedStudents.length}
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* ADD STUDENTS */}
        {/* ================================================= */}

        <section className="mb-6 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Thêm học sinh vào lớp
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Nhập họ tên, email hoặc số điện thoại để tìm kiếm
              học sinh.
            </p>
          </div>

          <div className="p-6">
            {/* SEARCH */}
            <div className="relative">
              <input
                type="text"
                value={studentSearch}
                onFocus={() => setShowStudentResults(true)}
                onChange={(event) => {
                  setStudentSearch(event.target.value);
                  setShowStudentResults(true);
                }}
                placeholder="Tìm học sinh theo tên, email hoặc số điện thoại..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {studentSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentSearch('');
                    setSelectedStudents([]);
                    setShowStudentResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  ×
                </button>
              )}
            </div>

            {/* SEARCH RESULT */}
            {showStudentResults &&
              studentSearch.trim() !== '' && (
                <div className="mt-4 rounded-lg border border-gray-200">
                  {/* LOADING */}
                  {loadingAvailableStudents && (
                    <div className="p-6 text-center text-sm text-gray-500">
                      Đang tìm kiếm học sinh...
                    </div>
                  )}

                  {/* SELECT ALL */}
                  {!loadingAvailableStudents &&
                    filteredAvailableStudents.length > 0 && (
                      <>
                        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 rounded border-gray-300"
                            />

                            <span className="text-sm font-medium text-gray-700">
                              Chọn tất cả
                            </span>
                          </label>

                          <span className="text-xs text-gray-500">
                            {filteredAvailableStudents.length} học sinh
                          </span>
                        </div>

                        {/* STUDENT RESULTS */}
                        <div className="max-h-80 overflow-y-auto">
                          {filteredAvailableStudents.map(
                            (student) => {
                              const selected =
                                selectedStudents.includes(
                                  student.user_id,
                                );

                              return (
                                <label
                                  key={student.user_id}
                                  className={`flex cursor-pointer items-center gap-4 border-b px-4 py-3 last:border-b-0 hover:bg-gray-50 ${
                                    selected
                                      ? 'bg-blue-50'
                                      : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() =>
                                      toggleStudent(
                                        student.user_id,
                                      )
                                    }
                                    className="h-4 w-4 rounded border-gray-300"
                                  />

                                  {/* AVATAR */}
                                  {student.avatar_url ? (
                                    <img
                                      src={student.avatar_url}
                                      alt={student.full_name}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                                      {getInitial(
                                        student.full_name,
                                      )}
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900">
                                      {student.full_name}
                                    </p>

                                    <p className="truncate text-sm text-gray-500">
                                      {student.email}
                                    </p>

                                    {student.phone && (
                                      <p className="text-xs text-gray-400">
                                        {student.phone}
                                      </p>
                                    )}
                                  </div>

                                  {student.grade_name && (
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                                      {student.grade_name}
                                    </span>
                                  )}
                                </label>
                              );
                            },
                          )}
                        </div>
                      </>
                    )}

                  {/* NO RESULT */}
                  {!loadingAvailableStudents &&
                    filteredAvailableStudents.length === 0 && (
                      <div className="p-6 text-center">
                        <p className="text-sm font-medium text-gray-700">
                          Không tìm thấy học sinh
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Hãy thử tìm bằng tên, email hoặc số
                          điện thoại khác.
                        </p>
                      </div>
                    )}
                </div>
              )}

            {/* ADD BUTTON */}
            {selectedStudents.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-700">
                  Đã chọn{' '}
                  <strong>{selectedStudents.length}</strong>{' '}
                  học sinh
                </p>

                <button
                  type="button"
                  onClick={addStudents}
                  disabled={addingStudents}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingStudents
                    ? 'Đang thêm...'
                    : `Thêm ${selectedStudents.length} học sinh`}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* CURRENT STUDENTS */}
        {/* ================================================= */}

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Học sinh trong lớp
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {students.length} học sinh đang học trong lớp
                </p>
              </div>

              <div className="w-full md:w-80">
                <input
                  type="text"
                  value={currentStudentSearch}
                  onChange={(event) =>
                    setCurrentStudentSearch(event.target.value)
                  }
                  placeholder="Tìm học sinh trong lớp..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {loadingStudents ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                <p className="text-sm text-gray-500">
                  Đang tải danh sách học sinh...
                </p>
              </div>
            ) : filteredCurrentStudents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
                <div className="mb-3 text-4xl">
                  👨‍🎓
                </div>

                <p className="font-medium text-gray-700">
                  {students.length === 0
                    ? 'Lớp chưa có học sinh'
                    : 'Không tìm thấy học sinh'}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {students.length === 0
                    ? 'Hãy tìm kiếm và thêm học sinh vào lớp.'
                    : 'Thử thay đổi từ khóa tìm kiếm.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">
                        Học sinh
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">
                        Email
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">
                        Số điện thoại
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">
                        Khối
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">
                        Ngày tham gia
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCurrentStudents.map(
                      (enrollment) => {
                        /*
                         * QUAN TRỌNG:
                         * API trả về:
                         *
                         * enrollment.student_profiles
                         *
                         * Không phải:
                         *
                         * enrollment.student
                         */

                        const student =
                          enrollment.student_profiles;

                        if (!student) {
                          return null;
                        }

                        return (
                          <tr
                            key={enrollment.id}
                            className="border-b last:border-b-0 hover:bg-gray-50"
                          >
                            {/* STUDENT */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {student.avatar_url ? (
                                  <img
                                    src={student.avatar_url}
                                    alt={student.full_name}
                                    className="h-11 w-11 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                                    {getInitial(
                                      student.full_name,
                                    )}
                                  </div>
                                )}

                                <div>
                                  <p className="font-medium text-gray-900">
                                    {student.full_name}
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    ID: {student.user_id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* EMAIL */}
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {student.email || '—'}
                            </td>

                            {/* PHONE */}
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {student.phone || '—'}
                            </td>

                            {/* GRADE */}
                            <td className="px-4 py-4">
                              {student.grade_name ? (
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                  {student.grade_name}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">
                                  Chưa xác định
                                </span>
                              )}
                            </td>

                            {/* JOINED DATE */}
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {formatDate(
                                enrollment.joined_at,
                              )}
                            </td>

                            {/* ACTION */}
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  removeStudent(
                                    student.user_id,
                                  )
                                }
                                disabled={
                                  removingStudentId ===
                                  student.user_id
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removingStudentId ===
                                student.user_id
                                  ? 'Đang xóa...'
                                  : 'Xóa'}
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}