'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Question = {
  id: string;

  type:
    | 'multiple_choice'
    | 'fill_number'
    | 'fill_expression'
    | 'input_answer'
    | 'real_world'
    | 'critical_thinking';

  content: string;

  options: string[];

  correctAnswer: string;

  solution: string;

  points: number;
};

type Exercise = {
  id: string;
  title: string;
  exercise_type: string;
  difficulty: string | null;

  grade_id: string;
  chapter_id: string | null;
  topic_id: string;

  grades: {
    name: string;
  };

  chapters: {
    name: string;
  } | null;

  topics: {
    name: string;
  } | null;
};

type Grade = {
  id: string;
  name: string;
  level_order: number;

  chapters: {
    id: string;
    name: string;

    topics: {
      id: string;
      name: string;
    }[];
  }[];
};

function emptyQuestion(): Question {
  return {
    id: '',
    type: 'multiple_choice',
    content: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    solution: '',
    points: 1,
  };
}

export default function EditExercisePage() {
  const params = useParams();
  const router = useRouter();

  const exerciseId = params.id as string;

  const [grades, setGrades] = useState<Grade[]>([]);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  const [title, setTitle] = useState('');
  const [exerciseType, setExerciseType] =
    useState('practice');

  const [gradeId, setGradeId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] =
    useState('medium');

  const [questions, setQuestions] = useState<Question[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  async function loadExercise() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/teachers/exercises/${exerciseId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Không thể tải bài tập'
        );
      }

      const item = data.exercise;

      setExercise(item);

      setGrades(data.grades || []);

      setTitle(item.title);
      setExerciseType(item.exercise_type);
      setGradeId(item.grade_id);
      setChapterId(item.chapter_id || '');
      setTopicId(item.topic_id);
      setDifficulty(item.difficulty || 'medium');

      const loadedQuestions =
        item.exercise_questions.map(
          (item: any) => {
            const question = item.questions;

            const contentData =
              question.content_data || {};

            const correctAnswer =
              question.correct_answer || {};

            return {
              id: question.id,
              type: question.type,
              content: question.content,
              options: Array.isArray(
                contentData.options
              )
                ? contentData.options
                : ['', '', '', ''],
              correctAnswer:
                typeof correctAnswer.value === 'string'
                  ? correctAnswer.value
                  : '',
              solution: question.solution || '',
              points: Number(item.points || 1),
            };
          }
        );

      setQuestions(
        loadedQuestions.length > 0
          ? loadedQuestions
          : [emptyQuestion()]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải bài tập'
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedGrade = grades.find(
    (item) => item.id === gradeId
  );

  const chapters = selectedGrade?.chapters || [];

  const selectedChapter = chapters.find(
    (item) => item.id === chapterId
  );

  const topics = selectedChapter?.topics || [];

  function updateQuestion(
    index: number,
    field: keyof Question,
    value: any
  ) {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index
          ? {
              ...question,
              [field]: value,
            }
          : question
      )
    );
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    value: string
  ) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== questionIndex) {
          return question;
        }

        const options = [...question.options];

        options[optionIndex] = value;

        return {
          ...question,
          options,
        };
      })
    );
  }

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      emptyQuestion(),
    ]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) {
      return;
    }

    setQuestions((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function addOption(index: number) {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index
          ? {
              ...question,
              options: [
                ...question.options,
                '',
              ],
            }
          : question
      )
    );
  }

  function removeOption(
    questionIndex: number,
    optionIndex: number
  ) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== questionIndex) {
          return question;
        }

        if (question.options.length <= 2) {
          return question;
        }

        return {
          ...question,
          options: question.options.filter(
            (_, index) => index !== optionIndex
          ),
        };
      })
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!title.trim()) {
      setError('Vui lòng nhập tên bài tập');
      return;
    }

    if (!gradeId || !topicId) {
      setError(
        'Vui lòng chọn đầy đủ khối và chủ đề'
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/teachers/exercises/${exerciseId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            exerciseType,
            gradeId,
            chapterId: chapterId || null,
            topicId,
            difficulty,
            questions,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Không thể cập nhật bài tập'
        );
      }

      setMessage(
        'Cập nhật bài tập thành công!'
      );

      await loadExercise();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật bài tập'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-8">
        <p>Đang tải bài tập...</p>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="p-8">
        <p>Không tìm thấy bài tập.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Sửa bài tập
            </h1>

            <p className="mt-1 text-gray-500">
              Xem và chỉnh sửa các câu hỏi đã tạo.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/dashboard/teacher/exercises'
              )
            }
            className="rounded-lg border bg-white px-4 py-2"
          >
            ← Quay lại
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">
              Thông tin bài tập
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block font-medium">
                  Tên bài tập
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Loại bài tập
                </label>

                <select
                  value={exerciseType}
                  onChange={(e) =>
                    setExerciseType(e.target.value)
                  }
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="worksheet">
                    Phiếu bài tập
                  </option>
                  <option value="practice">
                    Đề luyện tập
                  </option>
                  <option value="quiz">
                    Đề kiểm tra
                  </option>
                  <option value="review">
                    Đề ôn tập
                  </option>
                  <option value="advanced">
                    Đề nâng cao
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Độ khó
                </label>

                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value)
                  }
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="easy">Dễ</option>
                  <option value="medium">
                    Trung bình
                  </option>
                  <option value="hard">Khó</option>
                  <option value="mixed">
                    Hỗn hợp
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Khối
                </label>

                <select
                  value={gradeId}
                  onChange={(e) => {
                    setGradeId(e.target.value);
                    setChapterId('');
                    setTopicId('');
                  }}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  {grades.map((grade) => (
                    <option
                      key={grade.id}
                      value={grade.id}
                    >
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Chương
                </label>

                <select
                  value={chapterId}
                  onChange={(e) => {
                    setChapterId(e.target.value);
                    setTopicId('');
                  }}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="">
                    -- Chọn chương --
                  </option>

                  {chapters.map((chapter) => (
                    <option
                      key={chapter.id}
                      value={chapter.id}
                    >
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block font-medium">
                  Chủ đề
                </label>

                <select
                  value={topicId}
                  onChange={(e) =>
                    setTopicId(e.target.value)
                  }
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="">
                    -- Chọn chủ đề --
                  </option>

                  {topics.map((topic) => (
                    <option
                      key={topic.id}
                      value={topic.id}
                    >
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Câu hỏi
                </h2>

                <p className="text-sm text-gray-500">
                  {questions.length} câu hỏi
                </p>
              </div>

              <button
                type="button"
                onClick={addQuestion}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white"
              >
                + Thêm câu hỏi
              </button>
            </div>

            <div className="space-y-5">
              {questions.map(
                (question, index) => (
                  <div
                    key={
                      question.id ||
                      `new-${index}`
                    }
                    className="rounded-xl bg-white p-6 shadow-sm"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Câu {index + 1}
                      </h3>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeQuestion(index)
                          }
                          className="text-red-600"
                        >
                          Xóa câu
                        </button>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block font-medium">
                        Loại câu hỏi
                      </label>

                      <select
                        value={question.type}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            'type',
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border px-4 py-3"
                      >
                        <option value="multiple_choice">
                          Trắc nghiệm
                        </option>

                        <option value="fill_number">
                          Điền số
                        </option>

                        <option value="fill_expression">
                          Điền biểu thức
                        </option>

                        <option value="input_answer">
                          Nhập đáp án
                        </option>

                        <option value="real_world">
                          Bài toán thực tế
                        </option>

                        <option value="critical_thinking">
                          Tư duy
                        </option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block font-medium">
                        Nội dung câu hỏi
                      </label>

                      <textarea
                        value={question.content}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            'content',
                            e.target.value
                          )
                        }
                        rows={4}
                        className="w-full rounded-lg border px-4 py-3"
                      />
                    </div>

                    {question.type ===
                      'multiple_choice' && (
                      <div className="mb-4">
                        <div className="mb-2 flex justify-between">
                          <label className="font-medium">
                            Phương án
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              addOption(index)
                            }
                            className="text-blue-600"
                          >
                            + Thêm phương án
                          </button>
                        </div>

                        <div className="space-y-3">
                          {question.options.map(
                            (
                              option,
                              optionIndex
                            ) => (
                              <div
                                key={optionIndex}
                                className="flex gap-2"
                              >
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 font-semibold">
                                  {String.fromCharCode(
                                    65 +
                                      optionIndex
                                  )}
                                </div>

                                <input
                                  value={option}
                                  onChange={(e) =>
                                    updateOption(
                                      index,
                                      optionIndex,
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 rounded-lg border px-4"
                                />

                                {question
                                  .options
                                  .length >
                                  2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeOption(
                                        index,
                                        optionIndex
                                      )
                                    }
                                    className="px-3 text-red-500"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="mb-2 block font-medium">
                        Đáp án đúng
                      </label>

                      {question.type ===
                      'multiple_choice' ? (
                        <select
                          value={
                            question.correctAnswer
                          }
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              'correctAnswer',
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border px-4 py-3"
                        >
                          <option value="">
                            -- Chọn đáp án --
                          </option>

                          {question.options.map(
                            (_, optionIndex) => (
                              <option
                                key={optionIndex}
                                value={String.fromCharCode(
                                  65 +
                                    optionIndex
                                )}
                              >
                                {String.fromCharCode(
                                  65 +
                                    optionIndex
                                )}
                              </option>
                            )
                          )}
                        </select>
                      ) : (
                        <input
                          value={
                            question.correctAnswer
                          }
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              'correctAnswer',
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border px-4 py-3"
                        />
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block font-medium">
                        Lời giải
                      </label>

                      <textarea
                        value={question.solution}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            'solution',
                            e.target.value
                          )
                        }
                        rows={3}
                        className="w-full rounded-lg border px-4 py-3"
                      />
                    </div>

                    <div className="max-w-xs">
                      <label className="mb-2 block font-medium">
                        Điểm
                      </label>

                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={question.points}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            'points',
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-lg border px-4 py-3"
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          <div className="flex justify-end gap-3 pb-10">
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/dashboard/teacher/exercises'
                )
              }
              className="rounded-lg border bg-white px-6 py-3"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? 'Đang lưu...'
                : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}