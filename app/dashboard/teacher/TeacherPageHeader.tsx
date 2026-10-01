'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type TeacherPageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function TeacherPageHeader({
  title,
  description,
  action,
}: TeacherPageHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
        <div>
          <Link
            href="/dashboard/teacher"
            className="text-sm font-medium text-gray-500 transition hover:text-blue-600"
          >
            ← Teacher Portal
          </Link>

          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {title}
          </h1>

          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}