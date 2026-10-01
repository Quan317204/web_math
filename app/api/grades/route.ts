// app/api/grades/route.ts

import { NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';

export async function GET() {
  try {
    console.log('>>> GET /api/grades');

    const grades = await prisma.grades.findMany({
      select: {
        id: true,
        name: true,
        level_order: true,
      },
      orderBy: {
        level_order: 'asc',
      },
    });

    console.log('>>> Grades:', grades);

    return NextResponse.json({
      success: true,
      data: grades,
    });
  } catch (error) {
    console.error('>>> GET /api/grades ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Không thể tải danh sách khối',
      },
      {
        status: 500,
      }
    );
  }
}