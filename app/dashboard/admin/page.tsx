import Link from 'next/link';
import { redirect } from 'next/navigation';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import LogoutButton from '@/components/auth/LogoutButton';
import AdminAvatar from './AdminAvatar';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getSession();

  // Chưa đăng nhập
  if (!session) {
    redirect('/login');
  }

  // Không phải admin
  if (session.role !== 'admin') {
    redirect('/login');
  }

  // Lấy thông tin tài khoản admin
  const account = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      full_name: true,
      email: true,
      avatar_url: true,
    },
  });

  if (!account) {
    redirect('/login');
  }

  // Thống kê hệ thống
  const [
    totalUsers,
    totalStudents,
    totalTeachers,
    totalParents,
    totalClasses,
    totalLessons,
    totalQuestions,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.student_profiles.count(),

    prisma.teacher_profiles.count(),

    prisma.parent_profiles.count(),

    prisma.classes.count(),

    prisma.lessons.count(),

    prisma.questions.count(),
  ]);

  const features = [
    {
      title: 'Quản lý người dùng',
      description:
        'Quản lý tất cả tài khoản và phân quyền trong hệ thống.',
      href: '/dashboard/admin/users',
      icon: '👥',
      color: 'bg-blue-100',
    },
    {
      title: 'Quản lý giáo viên',
      description:
        'Quản lý hồ sơ, chuyên môn và hoạt động của giáo viên.',
      href: '/dashboard/admin/teachers',
      icon: '👨‍🏫',
      color: 'bg-purple-100',
    },
    {
      title: 'Quản lý phụ huynh',
      description:
        'Quản lý tài khoản phụ huynh và liên kết với học sinh.',
      href: '/dashboard/admin/parents',
      icon: '👨‍👩‍👧',
      color: 'bg-pink-100',
    },
    {
      title: 'Quản lý học sinh',
      description:
        'Quản lý hồ sơ, lớp học và trạng thái tài khoản học sinh.',
      href: '/dashboard/admin/students',
      icon: '🎓',
      color: 'bg-green-100',
    },
    {
      title: 'Quản lý lớp học',
      description:
        'Quản lý lớp, giáo viên phụ trách và danh sách học sinh.',
      href: '/dashboard/admin/classes',
      icon: '🏫',
      color: 'bg-orange-100',
    },
    {
      title: 'Quản lý chương trình học',
      description:
        'Quản lý khối lớp, chương, chủ đề và bài học.',
      href: '/dashboard/admin/curriculum',
      icon: '📚',
      color: 'bg-cyan-100',
    },
    {
      title: 'Quản lý học liệu',
      description:
        'Quản lý bài giảng, tài liệu, video và các học liệu.',
      href: '/dashboard/admin/materials',
      icon: '📖',
      color: 'bg-yellow-100',
    },
    {
      title: 'Ngân hàng câu hỏi',
      description:
        'Quản lý câu hỏi Toán theo khối, chủ đề và mức độ.',
      href: '/dashboard/admin/questions',
      icon: '❓',
      color: 'bg-indigo-100',
    },
    {
      title: 'Báo cáo & thống kê',
      description:
        'Theo dõi số liệu người dùng và hoạt động học tập.',
      href: '/dashboard/admin/reports',
      icon: '📊',
      color: 'bg-emerald-100',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ================= SIDEBAR ================= */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white p-5 lg:block">

        {/* Logo */}
        <Link
          href="/dashboard/admin"
          className="mb-8 block text-2xl font-extrabold text-blue-700"
        >
          Smart Math AI
        </Link>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Quản trị hệ thống
        </p>

        <nav className="space-y-2">

          {/* Tổng quan */}
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-3 rounded-xl bg-blue-600 px-3 py-3 text-sm font-medium text-white shadow-sm"
          >
            <span>🏠</span>
            <span>Tổng quan</span>
          </Link>

          {/* Các chức năng */}
          {features.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <span>{item.icon}</span>
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 w-full border-t border-slate-200 p-4">
          <LogoutButton />
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="p-4 sm:p-8 lg:ml-64">

        {/* ================= HEADER ================= */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-blue-600">
              ADMIN PORTAL
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Xin chào, {account.full_name ?? 'Quản trị viên'} 👋
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Quản lý và theo dõi toàn bộ hệ thống Smart Math AI.
            </p>
          </div>

          <AdminAvatar
            fullName={account.full_name ?? 'Quản trị viên'}
            email={account.email ?? ''}
            avatarUrl={account.avatar_url}
          />
        </header>

        {/* ================= WELCOME ================= */}
        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8">

          <p className="text-sm font-medium text-blue-100">
            ADMIN PORTAL
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Trung tâm quản trị hệ thống 🚀
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Quản lý người dùng, giáo viên, phụ huynh, học sinh,
            lớp học, chương trình học, học liệu và ngân hàng câu hỏi
            trên Smart Math AI.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">

            <Link
              href="/dashboard/admin/users"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              👥 Quản lý người dùng
            </Link>

            <Link
              href="/dashboard/admin/reports"
              className="rounded-xl bg-blue-500/40 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-blue-500/60"
            >
              📊 Xem báo cáo
            </Link>

          </div>
        </section>

        {/* ================= STATISTICS ================= */}
        <section className="mb-8">

          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Tổng quan hệ thống
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Thống kê dữ liệu hiện tại của Smart Math AI.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title="Tổng người dùng"
              value={totalUsers.toString()}
              icon="👥"
            />

            <StatCard
              title="Học sinh"
              value={totalStudents.toString()}
              icon="🎓"
            />

            <StatCard
              title="Giáo viên"
              value={totalTeachers.toString()}
              icon="👨‍🏫"
            />

            <StatCard
              title="Phụ huynh"
              value={totalParents.toString()}
              icon="👨‍👩‍👧"
            />

            <StatCard
              title="Lớp học"
              value={totalClasses.toString()}
              icon="🏫"
            />

            <StatCard
              title="Bài học"
              value={totalLessons.toString()}
              icon="📚"
            />

            <StatCard
              title="Câu hỏi"
              value={totalQuestions.toString()}
              icon="❓"
            />

          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Chức năng quản trị
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các chức năng quản lý chính dành cho quản trị viên.
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

                <h3 className="text-lg font-bold text-slate-800 transition group-hover:text-blue-700">
                  {item.title}
                </h3>

                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <div className="mt-4 font-semibold text-blue-600">
                  Quản lý →
                </div>

              </Link>
            ))}

          </div>
        </section>

      </main>
    </div>
  );
}


/* ================= STAT CARD ================= */

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
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

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