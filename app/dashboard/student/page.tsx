import Link from 'next/link';
import { redirect } from 'next/navigation';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import LogoutButton from '@/components/auth/LogoutButton';
import StudentAvatar from './StudentAvatar';

export const dynamic = 'force-dynamic';

export default async function StudentDashboard() {
  // =========================================================
  // KIỂM TRA ĐĂNG NHẬP
  // =========================================================

  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'student') {
    redirect('/login');
  }

  const studentId = session.userId;

  // =========================================================
  // THÔNG TIN TÀI KHOẢN
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
  // THÔNG TIN HỌC SINH
  // =========================================================

  const student = await prisma.student_profiles.findUnique({
    where: {
      user_id: studentId,
    },
    include: {
      user: true,
      grades: true,
    },
  });

  const studentName = account.full_name ?? 'Học sinh';
  const gradeName = student?.grades?.name ?? 'Chưa cập nhật';
  const totalPoints = student?.total_points ?? 0;
  const currentStreak = student?.current_streak ?? 0;

  // =========================================================
  // LẤY DỮ LIỆU DASHBOARD
  // =========================================================

  const [
    assignments,
    submissions,
    progress,
    conversations,
    recommendations,
  ] = await Promise.all([
    // Bài tập được giao
    prisma.assignments.findMany({
      where: {
        OR: [
          {
            student_id: studentId,
          },
          {
            classes: {
              class_enrollments: {
                some: {
                  student_id: studentId,
                  status: 'active',
                },
              },
            },
          },
        ],
      },
      include: {
        exercises: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 5,
    }),

    // Các bài đã làm
    prisma.submissions.findMany({
      where: {
        student_id: studentId,
      },
      include: {
        exercises: true,
      },
      orderBy: {
        started_at: 'desc',
      },
      take: 5,
    }),

    // Tiến độ học tập
    prisma.learning_progress.findMany({
      where: {
        student_id: studentId,
      },
      include: {
        lessons: {
          include: {
            topics: {
              include: {
                chapters: true,
              },
            },
          },
        },
      },
      orderBy: {
        last_accessed_at: 'desc',
      },
      take: 5,
    }),

    // Số cuộc trò chuyện AI
    prisma.ai_conversations.count({
      where: {
        student_id: studentId,
      },
    }),

    // Gợi ý học tập
    prisma.recommendations.findMany({
      where: {
        student_id: studentId,
        is_dismissed: false,
      },
      include: {
        lessons: true,
        exercises: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 3,
    }),
  ]);

  // =========================================================
  // TÍNH THỐNG KÊ
  // =========================================================

  const completedSubmissions = submissions.filter(
    (submission) => submission.status === 'submitted'
  ).length;

  const scoredSubmissions = submissions.filter(
    (submission) =>
      submission.total_score !== null
  );

  const averageScore =
    scoredSubmissions.length > 0
      ? scoredSubmissions.reduce(
          (sum, submission) =>
            sum + Number(submission.total_score),
          0
        ) / scoredSubmissions.length
      : 0;

  // =========================================================
  // CÁC CHỨC NĂNG
  // =========================================================

  const features = [
    {
      title: 'Học theo chương trình chính khóa',
      description:
        'Học bài giảng theo khối lớp, chương và từng bài học.',
      href: '/dashboard/student/curriculum',
      icon: '📚',
      color: 'bg-blue-100',
    },
    {
      title: 'Luyện tập theo chủ đề',
      description:
        'Chọn chủ đề, mức độ và luyện tập theo năng lực.',
      href: '/dashboard/student/practice',
      icon: '🎯',
      color: 'bg-purple-100',
    },
    {
      title: 'Học Toán tiếng Anh',
      description:
        'Học thuật ngữ, công thức và giải toán bằng tiếng Anh.',
      href: '/dashboard/student/english',
      icon: '🌎',
      color: 'bg-green-100',
    },
    {
      title: 'Bài tập tương tác',
      description:
        'Làm bài tập, xem kết quả và lời giải chi tiết.',
      href: '/dashboard/student/exercises',
      icon: '✍️',
      color: 'bg-orange-100',
    },
    {
      title: 'Hỏi AI Toán học',
      description:
        'Hỏi AI khi chưa hiểu bài hoặc cần gợi ý giải toán.',
      href: '/dashboard/student/ai-tutor',
      icon: '🤖',
      color: 'bg-pink-100',
    },
    {
      title: 'Theo dõi học tập',
      description:
        'Xem điểm số, tiến độ, thời gian học và chủ đề cần cải thiện.',
      href: '/dashboard/student/progress',
      icon: '📈',
      color: 'bg-cyan-100',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white p-5 lg:block">

        {/* Logo */}
        <Link
          href="/dashboard/student"
          className="mb-8 block text-2xl font-extrabold text-blue-700"
        >
          Smart Math AI
        </Link>

        {/* Role */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Học tập
        </p>

        {/* Navigation */}
        <nav className="space-y-2">

          {/* Tổng quan */}
          <Link
            href="/dashboard/student"
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

        {/* Đăng xuất */}
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
              STUDENT PORTAL
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Xin chào, {studentName} 👋
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Chào mừng bạn quay trở lại Smart Math AI.
            </p>
          </div>

          <div className="flex items-center gap-4">

            {/* Khối lớp */}
            <div className="hidden rounded-2xl bg-white px-5 py-3 shadow-sm sm:block">
              <p className="text-xs text-slate-500">
                Khối lớp
              </p>

              <p className="text-sm font-bold text-slate-800">
                {gradeName}
              </p>
            </div>

            {/* Điểm tích lũy */}
            <div className="rounded-2xl bg-white px-5 py-3 shadow-sm">
              <p className="text-xs text-slate-500">
                Điểm tích lũy
              </p>

              <p className="text-xl font-bold text-blue-700">
                ⭐ {totalPoints}
              </p>
            </div>

            {/* Avatar */}
            <StudentAvatar
              fullName={account.full_name ?? 'Học sinh'}
              email={account.email ?? ''}
              avatarUrl={account.avatar_url}
            />

          </div>
        </header>

        {/* ===================================================
            WELCOME BANNER
        =================================================== */}

        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8">

          <p className="text-sm font-medium text-blue-100">
            STUDENT PORTAL
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Xin chào, {studentName} 👋
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Chào mừng bạn đến với Smart Math AI.
            Học theo chương trình, luyện tập theo chủ đề,
            theo dõi tiến độ và sử dụng AI để hỗ trợ học Toán.
          </p>

          {/* <div className="mt-6 flex flex-wrap gap-3">

            <Link
              href="/dashboard/student/curriculum"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              📚 Tiếp tục học
            </Link>

            <Link
              href="/dashboard/student/practice"
              className="rounded-xl bg-blue-500/40 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-blue-500/60"
            >
              🎯 Luyện tập ngay
            </Link>

          </div> */}
        </section>

        {/* ===================================================
            STATISTICS
        ===================================================== */}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Bài đã hoàn thành"
            value={completedSubmissions.toString()}
            icon="✅"
          />

          <StatCard
            title="Điểm trung bình"
            value={averageScore.toFixed(1)}
            icon="🏆"
          />

          <StatCard
            title="Ngày học liên tiếp"
            value={currentStreak.toString()}
            icon="🔥"
          />

          <StatCard
            title="Cuộc trò chuyện AI"
            value={conversations.toString()}
            icon="🤖"
          />

        </section>

        {/* ===================================================
            MAIN FEATURES
        ===================================================== */}

        <section className="mb-8">

          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Khám phá học tập
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Chọn chức năng bạn muốn học hôm nay.
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
                  Bắt đầu học →
                </div>

              </Link>
            ))}

          </div>
        </section>

        {/* ===================================================
            ASSIGNMENTS
        ===================================================== */}

        <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Bài tập được giao
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Bài tập giáo viên giao cho bạn hoặc lớp của bạn.
              </p>
            </div>

            <Link
              href="/dashboard/student/exercises"
              className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Xem tất cả →
            </Link>

          </div>

          {assignments.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-5 text-center">

              <div className="mb-2 text-3xl">
                📝
              </div>

              <p className="text-sm text-slate-500">
                Hiện chưa có bài tập được giao.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50"
                >

                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800">
                      {assignment.exercises.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {assignment.exercises.question_count} câu hỏi
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/student/exercises/${assignment.exercise_id}`}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Làm bài →
                  </Link>

                </div>
              ))}

            </div>
          )}
        </section>

        {/* ===================================================
            LEARNING PROGRESS
        ===================================================== */}

        <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Tiếp tục học
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Các bài học bạn đã truy cập gần đây.
              </p>
            </div>

            <Link
              href="/dashboard/student/progress"
              className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Chi tiết →
            </Link>

          </div>

          {progress.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-5 text-center">

              <div className="mb-2 text-3xl">
                📚
              </div>

              <p className="text-sm text-slate-500">
                Bạn chưa có tiến độ học tập.
                Hãy bắt đầu từ chương trình chính khóa!
              </p>

            </div>
          ) : (
            <div className="space-y-5">

              {progress.map((item) => {
                const percent = Number(
                  item.completion_percent
                );

                return (
                  <div key={item.id}>

                    <div className="mb-2 flex justify-between gap-3">

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">
                          {item.lessons.title}
                        </p>

                        <p className="text-sm text-slate-500">
                          {item.lessons.topics.name}
                        </p>
                      </div>

                      <span className="shrink-0 font-semibold text-blue-600">
                        {percent.toFixed(0)}%
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, percent)
                          )}%`,
                        }}
                      />
                    </div>

                  </div>
                );
              })}

            </div>
          )}
        </section>

        {/* ===================================================
            RECOMMENDATIONS
        ===================================================== */}

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Gợi ý dành cho bạn
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nội dung được đề xuất dựa trên quá trình học tập.
            </p>
          </div>

          {recommendations.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-5 text-center">

              <div className="mb-2 text-3xl">
                💡
              </div>

              <p className="text-sm text-slate-500">
                Chưa có gợi ý học tập.
                Hãy làm bài tập để hệ thống có thêm dữ liệu đề xuất.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {recommendations.map((item) => (
                <Link
                  key={item.id}
                  href={
                    item.lesson_id
                      ? '/dashboard/student/curriculum'
                      : `/dashboard/student/exercises/${item.exercise_id}`
                  }
                  className="group block rounded-xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/50"
                >

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg">
                      {item.lesson_id ? '📚' : '✍️'}
                    </div>

                    <div className="min-w-0">

                      <p className="font-semibold text-slate-800 group-hover:text-blue-700">
                        {item.lessons?.title ??
                          item.exercises?.title ??
                          'Nội dung học tập'}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.reason ??
                          'Gợi ý học tập dành cho bạn'}
                      </p>

                    </div>

                  </div>

                </Link>
              ))}

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

      <p className="mt-3 text-3xl font-extrabold text-slate-900">
        {value}
      </p>

    </div>
  );
}