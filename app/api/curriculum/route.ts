import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";

export async function GET() {
  try {
    const grades = await prisma.grades.findMany({
      orderBy: {
        level_order: "asc",
      },
      include: {
        chapters: {
          orderBy: {
            order_index: "asc",
          },
          include: {
            topics: {
              orderBy: {
                order_index: "asc",
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: grades,
    });
  } catch (error) {
    console.error("GET /api/curriculum:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải chương trình học.",
      },
      { status: 500 }
    );
  }
}