import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function checkAdmin() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return null;
  }

  return session;
}

// GET /api/admin/classes/:id
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await checkAdmin();

    if (!session) {
      return NextResponse.json(
        { message: "Bạn không có quyền quản trị." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const item = await prisma.classes.findUnique({
      where: { id },
      include: {
        grades: true,
        _count: {
          select: {
            class_enrollments: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Không tìm thấy lớp học." },
        { status: 404 }
      );
    }

    const teacher = await prisma.teacher_profiles.findUnique({
      where: {
        user_id: item.teacher_id,
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
    });

    return NextResponse.json({
      data: {
        ...item,
        teacher: teacher
          ? {
              id: teacher.user_id,
              full_name: teacher.user?.full_name ?? "Chưa có tên",
              email: teacher.user?.email ?? "",
            }
          : null,
        student_count: item._count.class_enrollments,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/classes/[id]:", error);

    return NextResponse.json(
      { message: "Không thể tải thông tin lớp học." },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/classes/:id
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await checkAdmin();

    if (!session) {
      return NextResponse.json(
        { message: "Bạn không có quyền quản trị." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const current = await prisma.classes.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      return NextResponse.json(
        { message: "Không tìm thấy lớp học." },
        { status: 404 }
      );
    }

    const data: {
      name?: string;
      grade_id?: string;
      teacher_id?: string;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { message: "Tên lớp không được để trống." },
          { status: 400 }
        );
      }

      data.name = body.name.trim();
    }

    if (body.grade_id !== undefined) {
      if (typeof body.grade_id !== "string" || !body.grade_id) {
        return NextResponse.json(
          { message: "Khối lớp không hợp lệ." },
          { status: 400 }
        );
      }

      const grade = await prisma.grades.findUnique({
        where: { id: body.grade_id },
        select: { id: true },
      });

      if (!grade) {
        return NextResponse.json(
          { message: "Khối lớp không tồn tại." },
          { status: 400 }
        );
      }

      data.grade_id = body.grade_id;
    }

    if (body.teacher_id !== undefined) {
      if (
        typeof body.teacher_id !== "string" ||
        !body.teacher_id
      ) {
        return NextResponse.json(
          { message: "Giáo viên không hợp lệ." },
          { status: 400 }
        );
      }

      const teacher = await prisma.teacher_profiles.findUnique({
        where: { user_id: body.teacher_id },
        select: { user_id: true },
      });

      if (!teacher) {
        return NextResponse.json(
          { message: "Giáo viên chưa có hồ sơ giáo viên." },
          { status: 400 }
        );
      }

      data.teacher_id = body.teacher_id;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "Không có thông tin nào cần cập nhật." },
        { status: 400 }
      );
    }

    const updated = await prisma.classes.update({
      where: { id },
      data,
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

    return NextResponse.json({
      message: "Cập nhật lớp học thành công.",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/admin/classes/[id]:", error);

    return NextResponse.json(
      { message: "Không thể cập nhật lớp học." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/classes/:id
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await checkAdmin();

    if (!session) {
      return NextResponse.json(
        { message: "Bạn không có quyền quản trị." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const item = await prisma.classes.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Không tìm thấy lớp học." },
        { status: 404 }
      );
    }

    const enrollmentCount = await prisma.class_enrollments.count({
      where: { class_id: id },
    });

    if (enrollmentCount > 0) {
      return NextResponse.json(
        {
          message:
            `Không thể xóa lớp "${item.name}" vì vẫn có ` +
            `${enrollmentCount} bản ghi ghi danh. ` +
            "Hãy xử lý dữ liệu học sinh trước.",
        },
        { status: 409 }
      );
    }

    await prisma.classes.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Xóa lớp học thành công.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/classes/[id]:", error);

    return NextResponse.json(
      { message: "Không thể xóa lớp học." },
      { status: 500 }
    );
  }
}