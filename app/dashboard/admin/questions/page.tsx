
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Grade = { id: string; name: string; level_order: number };
type Topic = { id: string; name: string; chapter_id: string | null };
type Chapter = { id: string; name: string; grade_id: string };

type Question = {
  id: string;
  grade_id: string;
  chapter_id: string | null;
  topic_id: string;
  type: string;
  difficulty: string;
  language: string;
  content: string;
  content_data: unknown;
  correct_answer: unknown;
  solution: string | null;
  is_ai_generated: boolean;
  status: string;
  created_at: string;
  grades: Grade;
  topics: Topic;
  chapters: Chapter | null;
  user?: { id: string; full_name: string; email: string } | null;
  _count?: { exercise_questions: number; submission_answers: number };
};

const TYPES = [
  ['multiple_choice', 'Trắc nghiệm'],
  ['fill_number', 'Điền số'],
  ['drag_drop', 'Kéo thả'],
  ['matching', 'Nối cặp'],
  ['fill_expression', 'Điền biểu thức'],
  ['ordering', 'Sắp xếp'],
  ['input_answer', 'Nhập đáp án'],
  ['drawing', 'Vẽ hình'],
  ['real_world', 'Toán thực tế'],
  ['critical_thinking', 'Tư duy phản biện'],
  ['stem', 'STEM'],
];

const STATUSES = [
  ['draft', 'Bản nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['approved', 'Đã duyệt'],
  ['rejected', 'Từ chối'],
];

const DIFFICULTIES = [
  ['easy', 'Dễ'],
  ['medium', 'Trung bình'],
  ['hard', 'Khó'],
];

const emptyForm = {
  grade_id: '',
  chapter_id: '',
  topic_id: '',
  type: 'multiple_choice',
  difficulty: 'easy',
  language: 'vi',
  content: '',
  content_data: '',
  correct_answer: '',
  solution: '',
  status: 'draft',
};

type FormState = typeof emptyForm;

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Có lỗi xảy ra.');
  }

  return data;
}

function prettyJson(value: unknown) {
  if (value === null || value === undefined) return '';
  return JSON.stringify(value, null, 2);
}

function labelOf(items: string[][], value: string) {
  return items.find(([key]) => key === value)?.[1] ?? value;
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [q, setQ] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Question | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filteredChapters = useMemo(
    () => chapters.filter((c) => !form.grade_id || c.grade_id === form.grade_id),
    [chapters, form.grade_id],
  );

  const filteredTopics = useMemo(
    () =>
      topics.filter((t) => {
        const chapter = chapters.find((c) => c.id === t.chapter_id);
        const gradeMatches =
          !form.grade_id || !chapter || chapter.grade_id === form.grade_id;
        const chapterMatches = !form.chapter_id || t.chapter_id === form.chapter_id;
        return gradeMatches && chapterMatches;
      }),
    [topics, chapters, form.grade_id, form.chapter_id],
  );

  const filterChapters = useMemo(
    () => chapters.filter((c) => !gradeFilter || c.grade_id === gradeFilter),
    [chapters, gradeFilter],
  );

  const filterTopics = useMemo(
    () =>
      topics.filter((t) => {
        if (chapterFilter && t.chapter_id !== chapterFilter) return false;
        if (gradeFilter) {
          const chapter = chapters.find((c) => c.id === t.chapter_id);
          if (chapter && chapter.grade_id !== gradeFilter) return false;
        }
        return true;
      }),
    [topics, chapters, gradeFilter, chapterFilter],
  );

  const loadOptions = useCallback(async () => {
    const data = await api('/api/admin/questions?options=1');
    setGrades(data.grades ?? []);
    setTopics(data.topics ?? []);
    setChapters(data.chapters ?? []);
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });

      if (q.trim()) params.set('q', q.trim());
      if (gradeFilter) params.set('grade_id', gradeFilter);
      if (chapterFilter) params.set('chapter_id', chapterFilter);
      if (topicFilter) params.set('topic_id', topicFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (difficultyFilter) params.set('difficulty', difficultyFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (languageFilter) params.set('language', languageFilter);

      const data = await api(`/api/admin/questions?${params.toString()}`);
      setQuestions(data.questions ?? []);
      setStats(data.stats ?? {});
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, [
    page, q, gradeFilter, chapterFilter, topicFilter,
    typeFilter, difficultyFilter, statusFilter, languageFilter,
  ]);

  useEffect(() => {
    loadOptions().catch((e) =>
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu bộ lọc.'),
    );
  }, [loadOptions]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function resetFilters() {
    setQ('');
    setGradeFilter('');
    setChapterFilter('');
    setTopicFilter('');
    setTypeFilter('');
    setDifficultyFilter('');
    setStatusFilter('');
    setLanguageFilter('');
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(item: Question) {
    setEditingId(item.id);
    setForm({
      grade_id: item.grade_id,
      chapter_id: item.chapter_id ?? '',
      topic_id: item.topic_id,
      type: item.type,
      difficulty: item.difficulty,
      language: item.language,
      content: item.content,
      content_data: prettyJson(item.content_data),
      correct_answer: prettyJson(item.correct_answer),
      solution: item.solution ?? '',
      status: item.status,
    });
    setError('');
    setModalOpen(true);
  }

  async function saveQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    let content_data: unknown = null;
    let correct_answer: unknown;

    try {
      if (form.content_data.trim()) content_data = JSON.parse(form.content_data);
      correct_answer = JSON.parse(form.correct_answer);
    } catch {
      setError('JSON của dữ liệu câu hỏi hoặc đáp án không hợp lệ.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        chapter_id: form.chapter_id || null,
        content_data,
        correct_answer,
        solution: form.solution.trim() || null,
      };

      const result = await api(
        editingId
          ? `/api/admin/questions/${editingId}`
          : '/api/admin/questions',
        {
          method: editingId ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      );

      setModalOpen(false);
      setNotice(result.message || 'Đã lưu câu hỏi.');
      await loadQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể lưu câu hỏi.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(item: Question, status: string) {
    setError('');
    setNotice('');

    try {
      const result = await api(`/api/admin/questions/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setNotice(result.message || 'Đã cập nhật trạng thái.');
      await loadQuestions();
      if (detail?.id === item.id) {
        const fresh = await api(`/api/admin/questions/${item.id}`);
        setDetail(fresh.question);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật trạng thái.');
    }
  }

  async function deleteQuestion(item: Question) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa câu hỏi này?\n\n${item.content}`,
    );
    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      const result = await api(`/api/admin/questions/${item.id}`, {
        method: 'DELETE',
      });
      setNotice(result.message || 'Đã xóa câu hỏi.');
      setDetail(null);
      await loadQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể xóa câu hỏi.');
    }
  }

  async function viewDetail(item: Question) {
    setDetail(item);
    try {
      const result = await api(`/api/admin/questions/${item.id}`);
      setDetail(result.question);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải chi tiết câu hỏi.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/admin"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              ← Quay lại trang quản trị
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Quản lý câu hỏi</h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý ngân hàng câu hỏi, đáp án và quy trình duyệt.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            + Thêm câu hỏi
          </button>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Tổng câu hỏi', total],
            ['Bản nháp', stats.draft ?? 0],
            ['Chờ duyệt', stats.pending_review ?? 0],
            ['Đã duyệt', stats.approved ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError('')} className="ml-3 font-bold">×</button>
          </div>
        )}

        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {notice}
            <button onClick={() => setNotice('')} className="ml-3 font-bold">×</button>
          </div>
        )}

        <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Tìm theo nội dung câu hỏi hoặc lời giải..."
            className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setChapterFilter('');
                setTopicFilter('');
                setPage(1);
              }}
              className="rounded-lg border p-2"
            >
              <option value="">Tất cả khối lớp</option>
              {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>

            <select
              value={chapterFilter}
              onChange={(e) => { setChapterFilter(e.target.value); setTopicFilter(''); setPage(1); }}
              className="rounded-lg border p-2"
            >
              <option value="">Tất cả chương</option>
              {filterChapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={topicFilter}
              onChange={(e) => { setTopicFilter(e.target.value); setPage(1); }}
              className="rounded-lg border p-2"
            >
              <option value="">Tất cả chủ đề</option>
              {filterTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border p-2">
              <option value="">Tất cả dạng câu hỏi</option>
              {TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>

            <select value={difficultyFilter} onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }} className="rounded-lg border p-2">
              <option value="">Tất cả độ khó</option>
              {DIFFICULTIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>

            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border p-2">
              <option value="">Tất cả trạng thái</option>
              {STATUSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>

            <select value={languageFilter} onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }} className="rounded-lg border p-2">
              <option value="">Tất cả ngôn ngữ</option>
              <option value="vi">Tiếng Việt</option>
              <option value="en">Tiếng Anh</option>
            </select>

            <button
              onClick={resetFilters}
              className="rounded-lg border px-3 py-2 font-medium hover:bg-slate-50"
            >
              Xóa bộ lọc
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Đang tải câu hỏi...</p>
          ) : questions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">Không tìm thấy câu hỏi</p>
              <p className="mt-1 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc tạo câu hỏi mới.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Nội dung</th>
                    <th className="p-3">Khối / Chủ đề</th>
                    <th className="p-3">Dạng</th>
                    <th className="p-3">Độ khó</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {questions.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-slate-50">
                      <td className="max-w-sm p-3">
                        <button
                          onClick={() => viewDetail(item)}
                          className="text-left font-medium text-blue-700 hover:underline"
                        >
                          {item.content}
                        </button>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.is_ai_generated ? 'Tạo bởi AI' : 'Nhập thủ công'} ·{' '}
                          {new Date(item.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </td>
                      <td className="p-3">
                        <p>{item.grades?.name ?? '—'}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.topics?.name ?? '—'}</p>
                      </td>
                      <td className="p-3">{labelOf(TYPES as string[][], item.type)}</td>
                      <td className="p-3">{labelOf(DIFFICULTIES as string[][], item.difficulty)}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                          {labelOf(STATUSES as string[][], item.status)}
                        </span>
                      </td>
                      <td className="space-x-2 whitespace-nowrap p-3">
                        <button onClick={() => openEdit(item)} className="font-medium text-blue-700 hover:underline">Sửa</button>
                        {item.status !== 'approved' && (
                          <button onClick={() => updateStatus(item, 'approved')} className="font-medium text-green-700 hover:underline">Duyệt</button>
                        )}
                        {item.status !== 'rejected' && (
                          <button onClick={() => updateStatus(item, 'rejected')} className="font-medium text-orange-700 hover:underline">Từ chối</button>
                        )}
                        <button onClick={() => deleteQuestion(item)} className="font-medium text-red-700 hover:underline">Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
            <span className="text-slate-500">{total} câu hỏi · Trang {page}/{totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={saveQuestion}
            className="my-6 w-full max-w-3xl space-y-4 rounded-2xl bg-white p-5 shadow-xl md:p-7"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi mới'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-2xl text-slate-500">×</button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Khối lớp *</span>
                <select
                  required
                  value={form.grade_id}
                  onChange={(e) => setForm((f) => ({ ...f, grade_id: e.target.value, chapter_id: '', topic_id: '' }))}
                  className="w-full rounded-lg border p-2"
                >
                  <option value="">Chọn khối lớp</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Chương</span>
                <select
                  value={form.chapter_id}
                  onChange={(e) => setForm((f) => ({ ...f, chapter_id: e.target.value, topic_id: '' }))}
                  className="w-full rounded-lg border p-2"
                >
                  <option value="">Không chọn chương</option>
                  {filteredChapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Chủ đề *</span>
                <select
                  required
                  value={form.topic_id}
                  onChange={(e) => setForm((f) => ({ ...f, topic_id: e.target.value }))}
                  className="w-full rounded-lg border p-2"
                >
                  <option value="">Chọn chủ đề</option>
                  {filteredTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Dạng câu hỏi *</span>
                <select required value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full rounded-lg border p-2">
                  {TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Độ khó *</span>
                <select required value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className="w-full rounded-lg border p-2">
                  {DIFFICULTIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Ngôn ngữ</span>
                <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className="w-full rounded-lg border p-2">
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Nội dung câu hỏi *</span>
              <textarea
                required
                rows={4}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full rounded-lg border p-3"
                placeholder="Nhập nội dung câu hỏi..."
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Dữ liệu câu hỏi (JSON, tùy chọn)</span>
              <textarea
                rows={4}
                value={form.content_data}
                onChange={(e) => setForm((f) => ({ ...f, content_data: e.target.value }))}
                className="w-full rounded-lg border p-3 font-mono text-xs"
                placeholder={'Ví dụ trắc nghiệm: {"options":[{"label":"A","value":"2"},{"label":"B","value":"3"}]}'}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Đáp án đúng (JSON) *</span>
              <textarea
                required
                rows={3}
                value={form.correct_answer}
                onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))}
                className="w-full rounded-lg border p-3 font-mono text-xs"
                placeholder={'Ví dụ: {"value":"2"}'}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Lời giải</span>
              <textarea
                rows={3}
                value={form.solution}
                onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
                className="w-full rounded-lg border p-3"
                placeholder="Giải thích từng bước..."
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Trạng thái</span>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full rounded-lg border p-2">
                {STATUSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end gap-3 border-t pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2">Hủy</button>
              <button disabled={saving} type="submit" className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <section className="my-8 w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Chi tiết câu hỏi</h2>
              <button onClick={() => setDetail(null)} className="text-2xl text-slate-500">×</button>
            </div>

            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4">{detail.content}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="text-slate-500">Khối lớp:</span> {detail.grades?.name}</p>
              <p><span className="text-slate-500">Chủ đề:</span> {detail.topics?.name}</p>
              <p><span className="text-slate-500">Dạng:</span> {labelOf(TYPES as string[][], detail.type)}</p>
              <p><span className="text-slate-500">Độ khó:</span> {labelOf(DIFFICULTIES as string[][], detail.difficulty)}</p>
              <p><span className="text-slate-500">Ngôn ngữ:</span> {detail.language}</p>
              <p><span className="text-slate-500">Trạng thái:</span> {labelOf(STATUSES as string[][], detail.status)}</p>
            </div>

            <div>
              <h3 className="mb-1 font-semibold">Đáp án đúng</h3>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-green-300">{prettyJson(detail.correct_answer) || 'Chưa có đáp án'}</pre>
            </div>

            {detail.content_data != null && (
              <div>
                <h3 className="mb-1 font-semibold">Dữ liệu câu hỏi</h3>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{prettyJson(detail.content_data)}</pre>
              </div>
            )}

            <div>
              <h3 className="mb-1 font-semibold">Lời giải</h3>
              <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{detail.solution || 'Chưa có lời giải.'}</p>
            </div>

            <p className="text-xs text-slate-500">
              Được sử dụng trong {detail._count?.exercise_questions ?? 0} bài tập và{' '}
              {detail._count?.submission_answers ?? 0} câu trả lời của học sinh.
            </p>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <button onClick={() => { openEdit(detail); setDetail(null); }} className="rounded-lg border px-3 py-2">Sửa câu hỏi</button>
              {detail.status !== 'approved' && (
                <button onClick={() => updateStatus(detail, 'approved')} className="rounded-lg bg-green-600 px-3 py-2 text-white">Duyệt</button>
              )}
              {detail.status !== 'rejected' && (
                <button onClick={() => updateStatus(detail, 'rejected')} className="rounded-lg bg-orange-600 px-3 py-2 text-white">Từ chối</button>
              )}
              <button onClick={() => setDetail(null)} className="rounded-lg bg-slate-100 px-3 py-2">Đóng</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
