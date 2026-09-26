'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });

    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
    >
      Đăng xuất
    </button>
  );
}