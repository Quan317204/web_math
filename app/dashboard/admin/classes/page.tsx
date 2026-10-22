"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Grade = {
  id: string;
  name: string;
  level_order: number;
};

type Teacher = {
  id: string;
  full_name: string;
  email: string;
};

type ClassItem = {
  id: string;
  name: string;
  grade_id: string;
  teacher_id: string;
  grades: Grade;
  teacher: Teacher | null;
  student_count: number;
};

type FormState = {
  name: string;
  grade_id: string;
  teacher_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  grade_id: "",
  teacher_id: "",
};

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);

  const loadOptions = useCallback(async () => {
    const response = await fetch("/api/admin/classes?options=1", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message ?? "Không tải được dữ liệu.");
    }

    setGrades(result.grades ?? []);
    setTeachers(result.teachers ?? []);
  }, []);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
      });

      if (search.trim()) {
        params.set("q", search.trim());
      }

      if (gradeFilter) {
        params.set("grade_id", gradeFilter);
      }

      const response = await fetch(
        `/api/admin/classes?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Không tải được lớp học.");
      }

      setClasses(result.data ?? []);
      setTotalPages(result.pagination?.totalPages ?? 1);
      setTotalClasses(result.pagination?.total ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải lớp học."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, gradeFilter]);

  useEffect(() => {
    loadOptions().catch((err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách giáo viên và khối lớp."
      );
    });
  }, [loadOptions]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadClasses();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadClasses]);

  function openCreateForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      grade_id: grades[0]?.id ?? "",
      teacher_id: teachers[0]?.id ?? "",
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(item: ClassItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      grade_id: item.grade_id,
      teacher_id: item.teacher_id,
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên lớp.");
      return;
    }

    if (!form.grade_id || !form.teacher_id) {
      setError("Vui lòng chọn khối lớp và giáo viên phụ trách.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/classes/${editingId}`
          : "/api/admin/classes",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            grade_id: form.grade_id,
            teacher_id: form.teacher_id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Không thể lưu lớp học.");
      }

      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setNotice(result.message ?? "Đã lưu lớp học.");
      await loadClasses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể lưu lớp học."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ClassItem) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa lớp "${item.name}"?\n` +
        "Chỉ lớp chưa có bản ghi ghi danh mới được xóa."
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/classes/${item.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Không thể xóa lớp học.");
      }

      setNotice(result.message ?? "Đã xóa lớp học.");
      await loadClasses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể xóa lớp học."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/admin"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Quay lại trang quản trị
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
              Quản lý lớp học
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Quản lý lớp, khối lớp và giáo viên phụ trách.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={grades.length === 0 || teachers.length === 0}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Tạo lớp học
          </button>
        </header>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Tổng số lớp phù hợp bộ lọc</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalClasses}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Số khối lớp</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {grades.length}
            </p>
          </div>
        </section>

        {/* Search and filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <div>
              <label
                htmlFor="class-search"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Tìm kiếm lớp học
              </label>
              <input
                id="class-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Nhập tên lớp..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="grade-filter"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Lọc theo khối lớp
              </label>
              <select
                id="grade-filter"
                value={gradeFilter}
                onChange={(event) => {
                  setGradeFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="">Tất cả khối lớp</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Classes table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Danh sách lớp học
            </h2>
            <span className="text-sm text-slate-500">
              Trang {page}/{totalPages}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Đang tải danh sách lớp học...
            </div>
          ) : classes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium text-slate-700">
                Chưa có lớp học phù hợp
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Hãy thay đổi bộ lọc hoặc tạo lớp học mới.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Tên lớp</th>
                      <th className="px-5 py-3 font-semibold">Khối lớp</th>
                      <th className="px-5 py-3 font-semibold">
                        Giáo viên phụ trách
                      </th>
                      <th className="px-5 py-3 text-center font-semibold">
                        Học sinh
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {classes.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            ID: {item.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {item.grades?.name ?? "Chưa xác định"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {item.teacher?.full_name ?? "Chưa có hồ sơ"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.teacher?.email ?? ""}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {item.student_count ?? 0}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Sửa
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href =
                                    `/dashboard/admin/classes/${item.id}/students`;
                                }}
                                className="rounded-lg border border-blue-200 px-3 py-2 font-medium text-blue-600 hover:bg-blue-50"
                                >
                                Xem học sinh
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDelete(item)}
                              disabled={deletingId === item.id}
                              className="rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === item.id
                                ? "Đang xóa..."
                                : "Xóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Tổng cộng {totalClasses} lớp
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Create/edit modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setShowForm(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="class-form-title"
              className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="class-form-title"
                    className="text-xl font-bold text-slate-900"
                  >
                    {editingId ? "Chỉnh sửa lớp học" : "Tạo lớp học mới"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Nhập thông tin lớp học bên dưới.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  aria-label="Đóng"
                  className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="class-name"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Tên lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="class-name"
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ví dụ: 5A, Lớp Toán nâng cao"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="class-grade"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Khối lớp <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="class-grade"
                    required
                    value={form.grade_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        grade_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">-- Chọn khối lớp --</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="class-teacher"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Giáo viên phụ trách{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="class-teacher"
                    required
                    value={form.teacher_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        teacher_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                        {teacher.email ? ` — ${teacher.email}` : ""}
                      </option>
                    ))}
                  </select>

                  {teachers.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      Chưa có hồ sơ giáo viên. Hãy tạo tài khoản giáo viên
                      và hồ sơ tương ứng trước.
                    </p>
                  )}
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={saving || grades.length === 0 || teachers.length === 0}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingId
                        ? "Lưu thay đổi"
                        : "Tạo lớp"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}