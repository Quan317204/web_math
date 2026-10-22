import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

async function checkAdmin() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return null;
  }

  return session;
}

// GET /api/admin/classes
// GET /api/admin/classes?options=1
// GET /api/admin/classes?q=5A&grade_id=...
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdmin();

    if (!session) {
      return NextResponse.json(
        { message: "Bạn không có quyền quản trị." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Dữ liệu cho các dropdown khi tạo/sửa lớp.
    if (searchParams.get("options") === "1") {
      const [grades, teachers] = await Promise.all([
        prisma.grades.findMany({
          select: {
            id: true,
            name: true,
            level_order: true,
          },
          orderBy: {
            level_order: "asc",
          },
        }),

        prisma.teacher_profiles.findMany({
          select: {
            user_id: true,
            user: {
              select: {
                full_name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        grades,
        teachers: teachers.map((teacher) => ({
          id: teacher.user_id,
          full_name: teacher.user?.full_name ?? "Chưa có tên",
          email: teacher.user?.email ?? "",
        })),
      });
    }

    const q = searchParams.get("q")?.trim() ?? "";
    const gradeId = searchParams.get("grade_id") ?? "";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10) || 1
    );

    const pageSize = 10;

    const where = {
      ...(q
        ? {
            name: {
              contains: q,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(gradeId ? { grade_id: gradeId } : {}),
    };

    const [classes, total, gradeStats] = await Promise.all([
      prisma.classes.findMany({
        where,
        include: {
          grades: {
            select: {
              id: true,
              name: true,
              level_order: true,
            },
          },
          _count: {
            select: {
              class_enrollments: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      prisma.classes.count({ where }),

      prisma.classes.count(),
    ]);

    const teacherIds = [...new Set(classes.map((item) => item.teacher_id))];

    const teacherProfiles = teacherIds.length
      ? await prisma.teacher_profiles.findMany({
          where: {
            user_id: {
              in: teacherIds,
            },
          },
          select: {
            user_id: true,
            user: {
              select: {
                full_name: true,
                email: true,
              },
            },
          },
        })
      : [];

    const teacherMap = new Map(
      teacherProfiles.map((teacher) => [
        teacher.user_id,
        {
          full_name: teacher.user?.full_name ?? "Chưa có tên",
          email: teacher.user?.email ?? "",
        },
      ])
    );

    return NextResponse.json({
      data: classes.map((item) => ({
        ...item,
        teacher: teacherMap.get(item.teacher_id) ?? null,
        student_count: item._count.class_enrollments,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      stats: {
        totalClasses: gradeStats,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/classes:", error);

    return NextResponse.json(
      { message: "Không thể tải danh sách lớp học." },
      { status: 500 }
    );
  }
}

// POST /api/admin/classes
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdmin();

    if (!session) {
      return NextResponse.json(
        { message: "Bạn không có quyền quản trị." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const gradeId =
      typeof body.grade_id === "string" ? body.grade_id : "";

    const teacherId =
      typeof body.teacher_id === "string" ? body.teacher_id : "";

    if (!name || !gradeId || !teacherId) {
      return NextResponse.json(
        { message: "Vui lòng nhập tên lớp, khối lớp và giáo viên." },
        { status: 400 }
      );
    }

    const [grade, teacher] = await Promise.all([
      prisma.grades.findUnique({
        where: { id: gradeId },
        select: { id: true },
      }),

      prisma.teacher_profiles.findUnique({
        where: { user_id: teacherId },
        select: { user_id: true },
      }),
    ]);

    if (!grade) {
      return NextResponse.json(
        { message: "Khối lớp không tồn tại." },
        { status: 400 }
      );
    }

    if (!teacher) {
      return NextResponse.json(
        { message: "Giáo viên chưa có hồ sơ giáo viên." },
        { status: 400 }
      );
    }

    const created = await prisma.classes.create({
      data: {
        name,
        grade_id: gradeId,
        teacher_id: teacherId,
      },
      include: {
        grades: {
          select: {
            id: true,
            name: true,
            level_order: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Tạo lớp học thành công.",
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/classes:", error);

    return NextResponse.json(
      { message: "Không thể tạo lớp học." },
      { status: 500 }
    );
  }
}