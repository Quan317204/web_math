import Link from 'next/link';
import { redirect } from 'next/navigation';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import LogoutButton from '@/components/auth/LogoutButton';

import ParentAvatar from './ParentAvatar';

export const dynamic = 'force-dynamic';

export default async function ParentDashboard() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'parent') {
    redirect('/login');
  }

  // =========================================================
  // THÔNG TIN TÀI KHOẢN PHỤ HUYNH
  // =========================================================

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

  // =========================================================
  // DANH SÁCH CON ĐƯỢC LIÊN KẾT
  // =========================================================

  const links = await prisma.parent_student_links.findMany({
    where: {
      parent_id: session.userId,
    },
    include: {
      student_profiles: {
        include: {
          user: {
            select: {
              full_name: true,
              email: true,
              avatar_url: true,
            },
          },
          grades: true,
        },
      },
    },
  });

  // =========================================================
  // THỐNG KÊ TỪNG CON
  // =========================================================

  const children = await Promise.all(
    links.map(async (link) => {
      const child = link.student_profiles;

      const [submissions, progress] = await Promise.all([
        prisma.submissions.findMany({
          where: {
            student_id: child.user_id,
          },
          orderBy: {
            started_at: 'desc',
          },
          take: 10,
        }),

        prisma.learning_progress.findMany({
          where: {
            student_id: child.user_id,
          },
        }),
      ]);

      // Bài đã nộp
      const completed = submissions.filter(
        (submission) => submission.status === 'submitted'
      );

      // Bài đã có điểm
      const scored = completed.filter(
        (submission) => submission.total_score !== null
      );

      // Điểm trung bình
      const averageScore =
        scored.length > 0
          ? scored.reduce(
              (sum, submission) =>
                sum + Number(submission.total_score),
              0
            ) / scored.length
          : 0;

      // Tổng thời gian học
      const totalSeconds = submissions.reduce(
        (sum, submission) =>
          sum + (submission.time_spent_seconds ?? 0),
        0
      );

      // Tiến trình trung bình
      const completion =
        progress.length > 0
          ? progress.reduce(
              (sum, item) =>
                sum + Number(item.completion_percent),
              0
            ) / progress.length
          : 0;

      return {
        id: child.user_id,
        name: child.user.full_name,
        email: child.user.email,
        avatar: child.user.avatar_url,
        grade: child.grades.name,
        relationship: link.relationship,
        completed: completed.length,
        averageScore,
        totalSeconds,
        completion,
        submissions,
      };
    })
  );

  // =========================================================
  // THỐNG KÊ CHUNG CỦA PHỤ HUYNH
  // =========================================================

  const totalCompleted = children.reduce(
    (sum, child) => sum + child.completed,
    0
  );

  const totalStudySeconds = children.reduce(
    (sum, child) => sum + child.totalSeconds,
    0
  );

  const averageScore =
    children.length > 0
      ? children.reduce(
          (sum, child) => sum + child.averageScore,
          0
        ) / children.length
      : 0;

  // =========================================================
  // CÁC CHỨC NĂNG
  // =========================================================

  const features = [
    {
      title: 'Tiến trình học tập',
      description:
        'Theo dõi bài học và mức độ hoàn thành của con.',
      href: '/dashboard/parent/children',
      icon: '📚',
      color: 'bg-blue-100',
    },
    {
      title: 'Báo cáo kết quả',
      description:
        'Xem điểm số và kết quả các bài kiểm tra của con.',
      href: '/dashboard/parent/reports',
      icon: '📊',
      color: 'bg-purple-100',
    },
    {
      title: 'Thời lượng học',
      description:
        'Theo dõi thời gian học và luyện tập của con.',
      href: '/dashboard/parent/study-time',
      icon: '⏱️',
      color: 'bg-green-100',
    },
    {
      title: 'Thông báo học tập',
      description:
        'Xem các kết quả và hoạt động học tập gần đây.',
      href: '/dashboard/parent/notifications',
      icon: '🔔',
      color: 'bg-orange-100',
    },
  ];

  // =========================================================
  // KẾT QUẢ GẦN ĐÂY
  // Lấy tối đa 5 bài gần nhất của tất cả các con
  // =========================================================

  const recentResults = children
    .flatMap((child) =>
      child.submissions
        .filter(
          (submission) => submission.status === 'submitted'
        )
        .map((submission) => ({
          child,
          submission,
        }))
    )
    .sort((a, b) => {
      const dateA = a.submission.submitted_at
        ? new Date(a.submission.submitted_at).getTime()
        : 0;

      const dateB = b.submission.submitted_at
        ? new Date(b.submission.submitted_at).getTime()
        : 0;

      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white p-5 lg:block">

        {/* Logo */}
        <Link
          href="/dashboard/parent"
          className="mb-8 block text-2xl font-extrabold text-blue-700"
        >
          Smart Math AI
        </Link>

        {/* Role */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Phụ huynh
        </p>

        {/* Navigation */}
        <nav className="space-y-2">

          {/* Tổng quan */}
          <Link
            href="/dashboard/parent"
            className="flex items-center gap-3 rounded-xl bg-blue-600 px-3 py-3 text-sm font-medium text-white shadow-sm"
          >
            <span>🏠</span>
            <span>Tổng quan</span>
          </Link>

          {/* Features */}
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

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="p-4 sm:p-8 lg:ml-64">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-blue-600">
              PARENT PORTAL
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Xin chào, {account.full_name ?? 'Phụ huynh'} 👋
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Chào mừng bạn quay trở lại Smart Math AI.
            </p>
          </div>

          {/* Avatar */}
          <ParentAvatar
            fullName={account.full_name ?? 'Phụ huynh'}
            email={account.email ?? ''}
            avatarUrl={account.avatar_url}
          />
        </header>

        {/* ===================================================
            WELCOME BANNER
        =================================================== */}

        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-sm sm:p-8">

          <p className="text-sm font-medium text-blue-100">
            PARENT PORTAL
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Theo dõi hành trình học tập của con 👨‍👩‍👧
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Theo dõi tiến độ học tập, kết quả bài tập,
            thời lượng học và những hoạt động gần đây
            của con trên Smart Math AI.
          </p>
        </section>

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Số con được liên kết"
            value={children.length.toString()}
            icon="👨‍👩‍👧"
          />

          <StatCard
            title="Bài tập hoàn thành"
            value={totalCompleted.toString()}
            icon="✅"
          />

          <StatCard
            title="Điểm trung bình"
            value={averageScore.toFixed(1)}
            icon="🏆"
          />

          <StatCard
            title="Tổng thời gian học"
            value={`${Math.floor(
              totalStudySeconds / 3600
            )} giờ ${Math.floor(
              (totalStudySeconds % 3600) / 60
            )} phút`}
            icon="⏱️"
          />

        </section>

        {/* ===================================================
            CHILDREN
        =================================================== */}

        <section className="mb-8">

          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Các con của tôi
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Theo dõi kết quả học tập của từng con.
            </p>
          </div>

          {children.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">

              <div className="mb-3 text-4xl">
                👨‍👩‍👧
              </div>

              <h3 className="font-bold text-slate-800">
                Chưa có học sinh được liên kết
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Tài khoản của bạn chưa được liên kết với
                hồ sơ học sinh. Vui lòng liên hệ quản trị viên
                để liên kết tài khoản con.
              </p>

            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

              {children.map((child) => (
                <div
                  key={child.id}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >

                  {/* Child information */}
                  <div className="flex items-center gap-4">

                    {child.avatar ? (
                      <img
                        src={child.avatar}
                        alt={child.name}
                        className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                        {child.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((word) => word[0])
                          .slice(-2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">

                      <h3 className="truncate font-bold text-slate-900">
                        {child.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Khối {child.grade}
                        {child.relationship
                          ? ` · ${child.relationship}`
                          : ''}
                      </p>

                    </div>
                  </div>

                  {/* Child statistics */}
                  <div className="mt-6 grid grid-cols-2 gap-4">

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Bài hoàn thành
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {child.completed}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Điểm trung bình
                      </p>

                      <p className="mt-1 text-xl font-bold text-blue-700">
                        {child.averageScore.toFixed(1)}
                      </p>
                    </div>

                  </div>

                  {/* Progress */}
                  <div className="mt-5">

                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-500">
                        Tiến trình học
                      </span>

                      <span className="font-semibold text-slate-700">
                        {child.completion.toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, child.completion)
                          )}%`,
                        }}
                      />
                    </div>

                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                    <Link
                      href={`/dashboard/parent/children?studentId=${child.id}`}
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Xem tiến trình
                    </Link>

                    <Link
                      href={`/dashboard/parent/reports?studentId=${child.id}`}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Xem báo cáo
                    </Link>

                  </div>
                </div>
              ))}

            </div>
          )}
        </section>

        {/* ===================================================
            FEATURES
        =================================================== */}

        <section className="mb-8">

          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Chức năng dành cho phụ huynh
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các công cụ giúp phụ huynh đồng hành cùng con.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

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

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <div className="mt-4 font-semibold text-blue-600">
                  Xem chi tiết →
                </div>

              </Link>
            ))}

          </div>
        </section>

        {/* ===================================================
            RECENT RESULTS
        =================================================== */}

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Kết quả học tập gần đây
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Các bài tập con đã hoàn thành gần đây.
              </p>
            </div>

            <Link
              href="/dashboard/parent/reports"
              className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Xem báo cáo →
            </Link>

          </div>

          {recentResults.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-5 text-center">

              <div className="mb-2 text-3xl">
                📚
              </div>

              <p className="text-sm text-slate-500">
                Chưa có kết quả học tập để hiển thị.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {recentResults.map(
                ({ child, submission }) => (
                  <div
                    key={submission.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50"
                  >

                    <div className="flex items-center gap-3">

                      {child.avatar ? (
                        <img
                          src={child.avatar}
                          alt={child.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {child.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .map((word) => word[0])
                            .slice(-2)
                            .join('')
                            .toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-slate-800">
                          {child.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          {submission.submitted_at
                            ? new Date(
                                submission.submitted_at
                              ).toLocaleDateString('vi-VN')
                            : 'Chưa có ngày nộp'}
                        </p>
                      </div>

                    </div>

                    <div className="text-right">

                      <p className="font-bold text-blue-700">
                        {submission.total_score !== null
                          ? Number(
                              submission.total_score
                            ).toFixed(1)
                          : 'Chưa chấm'}
                      </p>

                      <p className="text-xs text-slate-500">
                        Điểm bài tập
                      </p>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>
      </main>
    </div>
  );
}

// =========================================================
// STAT CARD
// =========================================================

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

      <p className="mt-3 text-2xl font-extrabold text-slate-900">
        {value}
      </p>

    </div>
  );
}