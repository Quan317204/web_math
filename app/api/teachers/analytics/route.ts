import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function scorePercent(
  totalScore: unknown,
  maxScore: unknown,
): number | null {
  if (totalScore == null || maxScore == null) return null;

  const total = Number(totalScore);
  const max = Number(maxScore);

  if (!Number.isFinite(total) || !Number.isFinite(max) || max <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, (total / max) * 100));
}

function isCompleted(progress: {
  status: string;
  completion_percent: unknown;
}): boolean {
  return (
    progress.status === 'completed' ||
    Number(progress.completion_percent) >= 100
  );
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'teacher') {
      return NextResponse.json(
        { message: 'Bạn cần đăng nhập bằng tài khoản giáo viên.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const selectedClassId = searchParams.get('classId');

    // Chỉ lấy lớp do giáo viên hiện tại phụ trách.
    const classes = await prisma.classes.findMany({
      where: {
        teacher_id: session.userId,
        ...(selectedClassId ? { id: selectedClassId } : {}),
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        grades: {
          select: {
            name: true,
            level_order: true,
          },
        },
        class_enrollments: {
          where: {
            status: 'active',
          },
          select: {
            student_id: true,
            student_profiles: {
              select: {
                user_id: true,
                user: {
                  select: {
                    full_name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (selectedClassId && classes.length === 0) {
      return NextResponse.json(
        { message: 'Lớp học không tồn tại hoặc bạn không có quyền truy cập.' },
        { status: 404 },
      );
    }

    // Gom danh sách học sinh. Một học sinh có thể thuộc nhiều lớp.
    const studentMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        classIds: string[];
        classNames: string[];
      }
    >();

    for (const schoolClass of classes) {
      for (const enrollment of schoolClass.class_enrollments) {
        const profile = enrollment.student_profiles;
        const existing = studentMap.get(profile.user_id);

        if (existing) {
          if (!existing.classIds.includes(schoolClass.id)) {
            existing.classIds.push(schoolClass.id);
            existing.classNames.push(schoolClass.name);
          }
        } else {
          studentMap.set(profile.user_id, {
            id: profile.user_id,
            name: profile.user.full_name,
            email: profile.user.email,
            classIds: [schoolClass.id],
            classNames: [schoolClass.name],
          });
        }
      }
    }

    const students = Array.from(studentMap.values());
    const studentIds = students.map((student) => student.id);
    const classIds = classes.map((schoolClass) => schoolClass.id);

    if (studentIds.length === 0) {
      return NextResponse.json({
        overview: {
          averageScore: 0,
          completionRate: 0,
          totalStudySeconds: 0,
          progressChange: null,
          submissionCount: 0,
          completedSubmissionCount: 0,
          assignedCount: 0,
          completedAssignmentCount: 0,
          studentCount: 0,
        },
        classes: classes.map((schoolClass) => ({
          id: schoolClass.id,
          name: schoolClass.name,
          grade: schoolClass.grades.name,
          studentCount: 0,
          averageScore: 0,
          completionRate: 0,
        })),
        students: [],
        weakTopics: [],
        recommendations: [],
        message: 'Chưa có học sinh đang hoạt động trong phạm vi đã chọn.',
      });
    }

    // Lấy bài giao do giáo viên hiện tại tạo.
    const assignments = await prisma.assignments.findMany({
      where: {
        assigned_by: session.userId,
        OR: [
          ...(classIds.length > 0
            ? [{ class_id: { in: classIds } }]
            : []),
          { student_id: { in: studentIds } },
        ],
      },
      select: {
        id: true,
        exercise_id: true,
        class_id: true,
        student_id: true,
      },
    });

    const assignmentIds = assignments.map((item) => item.id);

    // Chỉ thống kê bài giao trong phạm vi trên hoặc bài độc lập
    // thuộc bài tập do chính giáo viên tạo.
    const submissions = await prisma.submissions.findMany({
      where: {
        student_id: { in: studentIds },
        OR: [
          ...(assignmentIds.length > 0
            ? [{ assignment_id: { in: assignmentIds } }]
            : []),
          {
            assignment_id: null,
            exercises: {
              created_by: session.userId,
            },
          },
        ],
      },
      select: {
        id: true,
        student_id: true,
        assignment_id: true,
        status: true,
        total_score: true,
        max_score: true,
        time_spent_seconds: true,
        started_at: true,
        submitted_at: true,
        exercises: {
          select: {
            id: true,
            title: true,
            topic_id: true,
            topics: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        started_at: 'desc',
      },
    });

    const completedSubmissions = submissions.filter(
      (submission) => submission.submitted_at !== null,
    );

    const scoredSubmissions = completedSubmissions
      .map((submission) => ({
        ...submission,
        score: scorePercent(
          submission.total_score,
          submission.max_score,
        ),
      }))
      .filter(
        (
          submission,
        ): submission is typeof submission & { score: number } =>
          submission.score !== null,
      );

    // Tạo danh sách các cặp bài giao - học sinh.
    // Một bài giao cho cả lớp tương ứng với một lượt cho mỗi học sinh.
    const expectedPairs = new Set<string>();
    const expectedPairsByClass = new Map<string, Set<string>>();
    const assignmentsByStudent = new Map<string, Set<string>>();

    for (const assignment of assignments) {
      let targetStudents: string[] = [];

      if (assignment.class_id) {
        const targetClass = classes.find(
          (item) => item.id === assignment.class_id,
        );

        targetStudents =
          targetClass?.class_enrollments.map(
            (enrollment) => enrollment.student_id,
          ) ?? [];
      } else if (
        assignment.student_id &&
        studentMap.has(assignment.student_id)
      ) {
        targetStudents = [assignment.student_id];
      }

      for (const studentId of targetStudents) {
        const pairKey = `${assignment.id}:${studentId}`;
        expectedPairs.add(pairKey);

        const studentAssignments =
          assignmentsByStudent.get(studentId) ?? new Set<string>();

        studentAssignments.add(assignment.id);
        assignmentsByStudent.set(studentId, studentAssignments);

        if (assignment.class_id) {
          const classPairs =
            expectedPairsByClass.get(assignment.class_id) ??
            new Set<string>();

          classPairs.add(pairKey);
          expectedPairsByClass.set(assignment.class_id, classPairs);
        }
      }
    }

    // Mỗi cặp bài giao - học sinh chỉ được tính hoàn thành một lần,
    // dù học sinh nộp lại nhiều lần.
    const completedPairs = new Set<string>();

    for (const submission of completedSubmissions) {
      if (!submission.assignment_id) continue;

      const key = `${submission.assignment_id}:${submission.student_id}`;

      if (expectedPairs.has(key)) {
        completedPairs.add(key);
      }
    }

    const assignedCount = expectedPairs.size;
    const completedAssignmentCount = completedPairs.size;

    const completionRate =
      assignedCount > 0
        ? round((completedAssignmentCount / assignedCount) * 100)
        : 0;

    const averageScore = round(
      average(scoredSubmissions.map((submission) => submission.score)),
    );

    const totalStudySeconds = submissions.reduce(
      (sum, submission) =>
        sum + Math.max(0, submission.time_spent_seconds ?? 0),
      0,
    );

    // So sánh điểm trong 30 ngày gần nhất với 30 ngày trước đó.
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const recentScores = scoredSubmissions.filter(
      (item) => item.submitted_at! >= thirtyDaysAgo,
    );

    const previousScores = scoredSubmissions.filter(
      (item) =>
        item.submitted_at! >= sixtyDaysAgo &&
        item.submitted_at! < thirtyDaysAgo,
    );

    const progressChange =
      recentScores.length > 0 && previousScores.length > 0
        ? round(
            average(recentScores.map((item) => item.score)) -
              average(previousScores.map((item) => item.score)),
          )
        : null;

    // Phân tích điểm theo chủ đề.
    const topicMap = new Map<
      string,
      {
        id: string;
        name: string;
        scores: number[];
        studentIds: Set<string>;
      }
    >();

    for (const submission of scoredSubmissions) {
      const topic = submission.exercises.topics;

      if (!topic) continue;

      const current = topicMap.get(topic.id) ?? {
        id: topic.id,
        name: topic.name,
        scores: [],
        studentIds: new Set<string>(),
      };

      current.scores.push(submission.score);
      current.studentIds.add(submission.student_id);
      topicMap.set(topic.id, current);
    }

    const weakTopics = Array.from(topicMap.values())
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        averageScore: round(average(topic.scores)),
        submissionCount: topic.scores.length,
        studentCount: topic.studentIds.size,
      }))
      .filter((topic) => topic.averageScore < 70)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 10);

    // Đề xuất bài học trong các chủ đề yếu.
    const weakTopicIds = weakTopics.map((topic) => topic.id);

    const lessons =
      weakTopicIds.length > 0
        ? await prisma.lessons.findMany({
            where: {
              topic_id: { in: weakTopicIds },
            },
            select: {
              id: true,
              title: true,
              summary: true,
              topic_id: true,
              order_index: true,
              topics: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: [{ topic_id: 'asc' }, { order_index: 'asc' }],
          })
        : [];

    const learningProgress =
      lessons.length > 0
        ? await prisma.learning_progress.findMany({
            where: {
              student_id: { in: studentIds },
              lesson_id: { in: lessons.map((lesson) => lesson.id) },
            },
            select: {
              student_id: true,
              lesson_id: true,
              status: true,
              completion_percent: true,
            },
          })
        : [];

    const progressByKey = new Map(
      learningProgress.map((item) => [
        `${item.student_id}:${item.lesson_id}`,
        item,
      ]),
    );

    const recommendations = lessons
      .map((lesson) => {
        const topic = weakTopics.find(
          (item) => item.id === lesson.topic_id,
        );

        const studentsNeedingLesson = students.filter((student) => {
          const progress = progressByKey.get(
            `${student.id}:${lesson.id}`,
          );

          return !progress || !isCompleted(progress);
        }).length;

        return {
          id: lesson.id,
          title: lesson.title,
          summary: lesson.summary,
          topicId: lesson.topic_id,
          topicName: lesson.topics.name,
          topicAverageScore: topic?.averageScore ?? 0,
          studentsNeedingLesson,
        };
      })
      .filter((lesson) => lesson.studentsNeedingLesson > 0)
      .sort(
        (a, b) =>
          a.topicAverageScore - b.topicAverageScore ||
          b.studentsNeedingLesson - a.studentsNeedingLesson,
      )
      .slice(0, 10);

    // Thống kê theo lớp.
    const classAnalytics = classes.map((schoolClass) => {
      const classStudentIds = new Set(
        schoolClass.class_enrollments.map(
          (enrollment) => enrollment.student_id,
        ),
      );

      const classScores = scoredSubmissions.filter((submission) =>
        classStudentIds.has(submission.student_id),
      );

      const classExpectedPairs =
        expectedPairsByClass.get(schoolClass.id) ?? new Set<string>();

      const classCompletedPairs = new Set<string>();

      for (const submission of completedSubmissions) {
        if (!submission.assignment_id) continue;

        const key = `${submission.assignment_id}:${submission.student_id}`;

        if (classExpectedPairs.has(key)) {
          classCompletedPairs.add(key);
        }
      }

      const classCompletionRate =
        classExpectedPairs.size > 0
          ? round(
              (classCompletedPairs.size / classExpectedPairs.size) * 100,
            )
          : 0;

      return {
        id: schoolClass.id,
        name: schoolClass.name,
        grade: schoolClass.grades.name,
        studentCount: schoolClass.class_enrollments.length,
        averageScore: round(
          average(classScores.map((submission) => submission.score)),
        ),
        completionRate: classCompletionRate,
      };
    });

    // Thống kê theo từng học sinh.
    const studentAnalytics = students.map((student) => {
      const studentSubmissions = submissions.filter(
        (submission) => submission.student_id === student.id,
      );

      const studentScores = scoredSubmissions.filter(
        (submission) => submission.student_id === student.id,
      );

      const recent = studentScores.filter(
        (item) => item.submitted_at! >= thirtyDaysAgo,
      );

      const previous = studentScores.filter(
        (item) =>
          item.submitted_at! >= sixtyDaysAgo &&
          item.submitted_at! < thirtyDaysAgo,
      );

      const studentProgress =
        recent.length > 0 && previous.length > 0
          ? round(
              average(recent.map((item) => item.score)) -
                average(previous.map((item) => item.score)),
            )
          : null;

      const studentExpectedAssignments =
        assignmentsByStudent.get(student.id) ?? new Set<string>();

      const studentCompletedAssignments = new Set<string>();

      for (const assignmentId of studentExpectedAssignments) {
        if (
          completedPairs.has(`${assignmentId}:${student.id}`)
        ) {
          studentCompletedAssignments.add(assignmentId);
        }
      }

      const studentCompletionRate =
        studentExpectedAssignments.size > 0
          ? round(
              (studentCompletedAssignments.size /
                studentExpectedAssignments.size) *
                100,
            )
          : 0;

      const studentTopicMap = new Map<
        string,
        { name: string; scores: number[] }
      >();

      for (const submission of studentScores) {
        const topic = submission.exercises.topics;

        if (!topic) continue;

        const current = studentTopicMap.get(topic.id) ?? {
          name: topic.name,
          scores: [],
        };

        current.scores.push(submission.score);
        studentTopicMap.set(topic.id, current);
      }

      const weakestTopic = Array.from(studentTopicMap.values())
        .map((topic) => ({
          name: topic.name,
          score: round(average(topic.scores)),
        }))
        .sort((a, b) => a.score - b.score)[0];

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        classNames: student.classNames,
        averageScore: round(
          average(studentScores.map((item) => item.score)),
        ),
        completionRate: studentCompletionRate,
        studySeconds: studentSubmissions.reduce(
          (sum, item) =>
            sum + Math.max(0, item.time_spent_seconds ?? 0),
          0,
        ),
        submissionCount: studentSubmissions.length,
        progressChange: studentProgress,
        weakestTopic: weakestTopic ?? null,
      };
    });

    return NextResponse.json({
      overview: {
        averageScore,
        completionRate,
        totalStudySeconds,
        progressChange,
        submissionCount: submissions.length,
        completedSubmissionCount: completedSubmissions.length,
        assignedCount,
        completedAssignmentCount,
        studentCount: students.length,
      },
      classes: classAnalytics,
      students: studentAnalytics,
      weakTopics,
      recommendations,
    });
  } catch (error) {
    console.error('[TEACHER_ANALYTICS_GET]', error);

    return NextResponse.json(
      { message: 'Không thể tải dữ liệu phân tích học tập.' },
      { status: 500 },
    );
  }
}

