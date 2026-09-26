'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type AdminAvatarProps = {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
};

export default function AdminAvatar({
  fullName,
  email,
  avatarUrl,
}: AdminAvatarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-full p-1.5 transition hover:bg-slate-100"
        aria-label="Thông tin tài khoản"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Ảnh đại diện"
            className="h-11 w-11 rounded-full border border-slate-200 object-cover ring-2 ring-blue-50"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white ring-2 ring-blue-50">
            {initials || 'AD'}
          </div>
        )}

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
            {fullName}
          </p>

          <p className="text-xs text-slate-500">
            Quản trị viên
          </p>
        </div>

        <span
          className={`text-sm text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          ⌄
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">

          {/* Account information */}
          <div className="border-b border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Ảnh đại diện"
                  className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {initials || 'AD'}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">
                  {fullName}
                </p>

                <p className="truncate text-sm text-slate-500">
                  {email}
                </p>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Quản trị viên
            </div>
          </div>

          {/* Menu */}
          <div className="p-2">
            <Link
              href="/dashboard/admin/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <span>👤</span>
              <span>Thông tin cá nhân</span>
            </Link>

            <Link
              href="/dashboard/admin/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <span>👥</span>
              <span>Quản lý người dùng</span>
            </Link>

            <Link
              href="/dashboard/admin/reports"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <span>📊</span>
              <span>Báo cáo thống kê</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}