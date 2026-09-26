import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/auth';
import LogoutButton from '@/components/auth/LogoutButton';
import TeacherAvatar from './TeacherAvatar';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboard() {
  const session = await requireRole('teacher');

  if (!session) {
    redirect('/login');
  }

  const account = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      full_name: true,
      email: true,
      phone: true,
      role: true,
      avatar_url: true,
    },
  });

  if (!account) {
    redirect('/login');
  }

  const features = [
    {
      title: 'Quản lý lớp học',
      description: 'Tạo, chỉnh sửa và quản lý các lớp học của bạn.',
      icon: '🏫',
      href: '/dashboard/teacher/classes',
      color: 'bg-blue-100',
    },
    {
      title: 'Quản lý học sinh',
      description: 'Xem danh sách và thông tin học sinh trong lớp.',
      icon: '👨‍🎓',
      href: '/dashboard/teacher/students',
      color: 'bg-purple-100',
    },
    {
      title: 'Tạo bài tập',
      description: 'Tạo bài tập toán và giao bài cho học sinh.',
      icon: '📝',
      href: '/dashboard/teacher/exercises',
      color: 'bg-green-100',
    },
    {
      title: 'Tạo đề kiểm tra',
      description:
        'Tạo đề kiểm tra theo lớp, chương, chủ đề và độ khó.',
      icon: '📋',
      href: '/dashboard/teacher/tests',
      color: 'bg-orange-100',
    },
    {
      title: 'Theo dõi tiến độ',
      description:
        'Theo dõi quá trình học tập và kết quả của học sinh.',
      icon: '📈',
      href: '/dashboard/teacher/progress',
      color: 'bg-cyan-100',
    },
    {
      title: 'Phân tích năng lực',
      description:
        'Phân tích điểm mạnh, điểm yếu và năng lực từng học sinh.',
      icon: '📊',
      href: '/dashboard/teacher/analytics',
      color: 'bg-pink-100',
    },
    {
      title: 'Học liệu bằng AI',
      description:
        'Sử dụng AI để tạo câu hỏi, bài tập và học liệu toán.',
      icon: '🤖',
      href: '/dashboard/teacher/ai',
      color: 'bg-indigo-100',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-white p-5 lg:block">
        <Link
          href="/dashboard/teacher"
          className="mb-8 block text-2xl font-extrabold text-blue-700"
        >
          Smart Math AI
        </Link>

        <p className="mb-3 text-xs font-semibold uppercase text-slate-400">
          Giảng dạy
        </p>

        <nav className="space-y-2">
          {/* Tổng quan */}
          <Link
            href="/dashboard/teacher"
            className="flex items-center gap-3 rounded-xl bg-blue-600 px-3 py-3 text-sm font-medium text-white"
          >
            <span>🏠</span>
            Tổng quan
          </Link>

          {/* Các chức năng */}
          {features.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <span>{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Đăng xuất */}
        <div className="absolute bottom-0 left-0 w-full border-t border-slate-200 p-4">
          <LogoutButton />
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}
      <main className="p-4 sm:p-8 lg:ml-64">

        {/* =====================================================
            HEADER
        ===================================================== */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              TEACHER PORTAL
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Xin chào, {account.full_name ?? 'Giáo viên'} 👋
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Chào mừng bạn quay trở lại Smart Math AI.
            </p>
          </div>

          <TeacherAvatar
            fullName={account.full_name ?? 'Giáo viên'}
            email={account.email ?? ''}
            avatarUrl={account.avatar_url}
          />
        </header>

        {/* =====================================================
            WELCOME
        ===================================================== */}
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-100">
            TEACHER PORTAL
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Xin chào, {account.full_name ?? 'Giáo viên'} 👋
          </h1>

          <p className="mt-3 max-w-2xl text-blue-100">
            Chào mừng bạn đến với Smart Math AI.
            Quản lý lớp học, tạo bài tập, theo dõi tiến độ
            và sử dụng AI để hỗ trợ giảng dạy.
          </p>
        </section>

        {/* =====================================================
            STATISTICS
        ===================================================== */}
        <section className="mb-8 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Lớp học"
            value="--"
            icon="🏫"
          />

          <StatCard
            title="Học sinh"
            value="--"
            icon="👨‍🎓"
          />

          <StatCard
            title="Bài tập"
            value="--"
            icon="📝"
          />

          <StatCard
            title="Đề kiểm tra"
            value="--"
            icon="📋"
          />
        </section>

        {/* =====================================================
            MAIN FEATURES
        ===================================================== */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Chức năng giảng dạy
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các công cụ hỗ trợ quản lý và giảng dạy
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${item.color}`}
                >
                  {item.icon}
                </div>

                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700">
                  {item.title}
                </h3>

                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <div className="mt-4 font-semibold text-blue-600">
                  Mở chức năng →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* =====================================================
            AI SECTION
        ===================================================== */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">
                🤖
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Trợ lý AI cho giáo viên
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Tạo câu hỏi toán, bài tập, đề kiểm tra và
                  học liệu giảng dạy bằng AI theo lớp,
                  chương, chủ đề và mức độ khó.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/teacher/ai"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Sử dụng AI →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {title}
        </p>

        <span className="text-2xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}