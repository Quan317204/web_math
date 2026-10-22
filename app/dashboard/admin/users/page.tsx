
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login_at?: string | null;
};

type UserForm = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  grade_id: string;
};

const EMPTY_FORM: UserForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'student',
  status: 'active',
  grade_id: '',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Học sinh',
  parent: 'Phụ huynh',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Vô hiệu hóa',
  banned: 'Bị khóa',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q,
        role,
        status,
        page: String(page),
        limit: '10',
      });

      const response = await fetch(`/api/users?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Không tải được danh sách.');
      }

      setUsers(result.users ?? []);
      setTotal(result.pagination?.total ?? 0);
      setTotalPages(Math.max(1, result.pagination?.totalPages ?? 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  }, [q, role, status, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setNotice('');
    setError('');
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone ?? '',
      password: '',
      role: user.role,
      status: user.status,
      grade_id: '',
    });
    setShowForm(true);
    setNotice('');
    setError('');
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload: Record<string, string | null> = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
      };

      if (form.password) payload.password = form.password;

      if (form.role === 'student' && form.grade_id.trim()) {
        payload.grade_id = form.grade_id.trim();
      }

      let url = '/api/users';
      let method = 'POST';

      if (editing) {
        url = `/api/users/${editing.id}`;
        method = 'PATCH';
        payload.status = form.status;

        // Chỉ gửi grade_id nếu quản trị viên nhập giá trị mới.
        if (form.grade_id.trim()) {
          payload.grade_id = form.grade_id.trim();
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Không lưu được tài khoản.');
      }

      setShowForm(false);
      setNotice(result.message || 'Lưu thành công.');

      if (!editing) setPage(1);

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: User) {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = nextStatus === 'active' ? 'mở lại' : 'vô hiệu hóa';

    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản "${user.full_name}"?`)) {
      return;
    }

    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Không cập nhật được trạng thái.');
      }

      setNotice(result.message);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    }
  }

  async function deactivateUser(user: User) {
    if (!window.confirm(
      `Vô hiệu hóa tài khoản "${user.full_name}"? Dữ liệu học tập sẽ được giữ lại.`,
    )) {
      return;
    }

    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Không thể vô hiệu hóa tài khoản.');
      }

      setNotice(result.message);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    }
  }

  function changeFilter(
    setter: (value: string) => void,
    value: string,
  ) {
    setter(value);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/admin"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          ← Quay lại trang quản trị
        </Link>

        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              ADMIN PORTAL
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Quản lý người dùng
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Quản lý tài khoản, vai trò và trạng thái hoạt động.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Thêm người dùng
          </button>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tổng người dùng', value: total, icon: '👥' },
            {
              label: 'Đang hoạt động',
              value: users.filter((u) => u.status === 'active').length,
              icon: '✅',
            },
            {
              label: 'Giáo viên',
              value: users.filter((u) => u.role === 'teacher').length,
              icon: '👨‍🏫',
            },
            {
              label: 'Học sinh',
              value: users.filter((u) => u.role === 'student').length,
              icon: '🎓',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 sm:text-sm">
                  {item.label}
                </span>
                <span>{item.icon}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {notice && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-3">
            <input
              value={q}
              onChange={(e) => changeFilter(setQ, e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={role}
              onChange={(e) => changeFilter(setRole, e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Tất cả vai trò</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => changeFilter(setStatus, e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Người dùng</th>
                  <th className="px-5 py-4">Số điện thoại</th>
                  <th className="px-5 py-4">Vai trò</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Ngày tạo</th>
                  <th className="px-5 py-4">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Không tìm thấy người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {user.full_name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {user.phone || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700">
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : user.status === 'banned'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {STATUS_LABELS[user.status] ?? user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEdit(user)}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => void toggleStatus(user)}
                            className="font-medium text-amber-700 hover:underline"
                          >
                            {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                          </button>
                          <button
                            onClick={() => void deactivateUser(user)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            Vô hiệu hóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <p className="text-sm text-slate-500">
              Tổng cộng {total} tài khoản · Trang {page}/{totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </section>

        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) setShowForm(false);
            }}
          >
            <form
              onSubmit={saveUser}
              className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editing ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Nhập thông tin người dùng bên dưới.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Họ và tên *
                  <input
                    required
                    maxLength={255}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Email *
                  <input
                    required
                    type="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Số điện thoại
                  <input
                    maxLength={20}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Vai trò *
                  <select
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                {form.role === 'student' && (
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    ID khối lớp {editing ? '(chỉ nhập khi cần đổi khối lớp)' : '*'}
                    <input
                      required={!editing}
                      value={form.grade_id}
                      onChange={(e) => setForm({ ...form, grade_id: e.target.value })}
                      placeholder="Nhập UUID của khối lớp trong bảng grades"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      Dùng ID thực tế trong database, không nhập tên lớp.
                    </span>
                  </label>
                )}

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  {editing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
                  <input
                    required={!editing}
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editing ? '••••••••' : 'Ít nhất 8 ký tự'}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </label>

                {editing && (
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    Trạng thái tài khoản
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
