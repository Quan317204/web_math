"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Topic = {
  id: string;
  name: string;
  name_en?: string | null;
};

type Chapter = {
  id: string;
  name: string;
  topics: Topic[];
};

type Grade = {
  id: string;
  name: string;
  level_order: number;
  chapters: Chapter[];
};

type Question = {
  id: string;
  type: string;
  question: string;
  options: string[];
  answer: string | number | boolean;
  difficulty: string;
  solution: string;
};

type GeneratedData = {
  exercise: {
    id: string;
    title: string;
    exercise_type: string;
    question_count: number;
  };
  questions: Question[];
};

const questionTypes = [
  {
    value: "multiple_choice",
    label: "Trắc nghiệm",
  },
  {
    value: "fill_number",
    label: "Điền số",
  },
  {
    value: "fill_expression",
    label: "Điền biểu thức",
  },
  {
    value: "matching",
    label: "Nối",
  },
  {
    value: "drag_drop",
    label: "Kéo thả",
  },
  {
    value: "ordering",
    label: "Sắp xếp",
  },
  {
    value: "input_answer",
    label: "Nhập đáp án",
  },
  {
    value: "real_world",
    label: "Bài toán thực tế",
  },
];

const difficulties = [
  {
    value: "easy",
    label: "Dễ",
  },
  {
    value: "medium",
    label: "Trung bình",
  },
  {
    value: "hard",
    label: "Khó",
  },
  {
    value: "mixed",
    label: "Trộn độ khó",
  },
];

const exerciseTypes = [
  {
    value: "worksheet",
    label: "Phiếu bài tập",
  },
  {
    value: "practice",
    label: "Đề luyện tập",
  },
  {
    value: "quiz",
    label: "Đề kiểm tra",
  },
  {
    value: "review",
    label: "Đề ôn tập",
  },
  {
    value: "advanced",
    label: "Đề nâng cao",
  },
];

export default function CreateAIExercisePage() {
  const router = useRouter();

  const [grades, setGrades] = useState<Grade[]>([]);

  const [gradeId, setGradeId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");

  const [questionType, setQuestionType] =
    useState("multiple_choice");

  const [difficulty, setDifficulty] =
    useState("medium");

  const [exerciseType, setExerciseType] =
    useState("worksheet");

  const [quantity, setQuantity] = useState(10);

  const [loading, setLoading] = useState(false);
  const [loadingCurriculum, setLoadingCurriculum] =
    useState(true);

  const [error, setError] = useState("");
  const [generated, setGenerated] =
    useState<GeneratedData | null>(null);

  useEffect(() => {
    async function loadCurriculum() {
      try {
        setLoadingCurriculum(true);

        const response = await fetch(
          "/api/curriculum",
          {
            cache: "no-store",
          }
        );

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(
            json.message ||
              "Không thể tải chương trình học."
          );
        }

        setGrades(json.data || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải chương trình học."
        );
      } finally {
        setLoadingCurriculum(false);
      }
    }

    loadCurriculum();
  }, []);

  const selectedGrade = useMemo(
    () => grades.find((g) => g.id === gradeId),
    [grades, gradeId]
  );

  const chapters = selectedGrade?.chapters || [];

  const selectedChapter = useMemo(
    () =>
      chapters.find(
        (chapter) => chapter.id === chapterId
      ),
    [chapters, chapterId]
  );

  const topics = selectedChapter?.topics || [];

  function handleGradeChange(value: string) {
    setGradeId(value);
    setChapterId("");
    setTopicId("");
  }

  function handleChapterChange(value: string) {
    setChapterId(value);
    setTopicId("");
  }

  async function handleGenerate(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setGenerated(null);

    if (!gradeId) {
      setError("Vui lòng chọn khối lớp.");
      return;
    }

    if (!chapterId) {
      setError("Vui lòng chọn chương học.");
      return;
    }

    if (!topicId) {
      setError("Vui lòng chọn chủ đề.");
      return;
    }

    if (quantity < 1 || quantity > 50) {
      setError("Số câu phải từ 1 đến 50.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/ai/generate-exercise",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grade_id: gradeId,
            chapter_id: chapterId,
            topic_id: topicId,
            question_type: questionType,
            difficulty,
            quantity,
            exercise_type: exerciseType,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.message ||
            "Không thể tạo bài tập."
        );
      }

      setGenerated(json.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tạo bài tập."
      );
    } finally {
      setLoading(false);
    }
  }

  function printExercise() {
    window.print();
  }

  function exportWord() {
    if (!generated) return;

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${generated.exercise.title}</title>
        </head>
        <body>
          <h1>${generated.exercise.title}</h1>

          ${generated.questions
            .map(
              (q, index) => `
                <div style="margin-bottom: 24px;">
                  <p>
                    <strong>Câu ${index + 1}:</strong>
                    ${q.question}
                  </p>

                  ${
                    q.options.length
                      ? `
                        <ol type="A">
                          ${q.options
                            .map(
                              (option) =>
                                `<li>${option}</li>`
                            )
                            .join("")}
                        </ol>
                      `
                      : ""
                  }

                  <p>
                    <strong>Đáp án:</strong>
                    ${q.answer}
                  </p>

                  <p>
                    <strong>Lời giải:</strong>
                    ${q.solution}
                  </p>
                </div>
              `
            )
            .join("")}
        </body>
      </html>
    `;

    const blob = new Blob(
      [html],
      {
        type: "application/msword",
      }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${generated.exercise.title}.doc`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function exportAnswers() {
    if (!generated) return;

    const content = generated.questions
      .map(
        (q, index) =>
          `Câu ${index + 1}: ${q.answer}`
      )
      .join("\n");

    const blob = new Blob(
      [content],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${generated.exercise.title}-dap-an.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function exportSolutions() {
    if (!generated) return;

    const content = generated.questions
      .map(
        (q, index) =>
          `Câu ${index + 1}\n${q.solution}`
      )
      .join("\n\n");

    const blob = new Blob(
      [content],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${generated.exercise.title}-loi-giai.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (loadingCurriculum) {
    return (
      <main className="p-8">
        Đang tải chương trình học...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              AI tạo bài tập
            </h1>

            <p className="mt-1 text-slate-600">
              Giáo viên chọn yêu cầu, AI tự động sinh
              đề, đáp án và lời giải.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/teacher/exercises"
              )
            }
            className="rounded-lg border bg-white px-4 py-2"
          >
            ← Quay lại
          </button>
        </div>

        <form
          onSubmit={handleGenerate}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">
                Khối lớp
              </label>

              <select
                value={gradeId}
                onChange={(e) =>
                  handleGradeChange(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3"
              >
                <option value="">
                  -- Chọn khối --
                </option>

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
                Chương học
              </label>

              <select
                value={chapterId}
                disabled={!gradeId}
                onChange={(e) =>
                  handleChapterChange(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3 disabled:bg-slate-100"
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

            <div>
              <label className="mb-2 block font-medium">
                Chủ đề
              </label>

              <select
                value={topicId}
                disabled={!chapterId}
                onChange={(e) =>
                  setTopicId(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3 disabled:bg-slate-100"
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

            <div>
              <label className="mb-2 block font-medium">
                Dạng bài
              </label>

              <select
                value={questionType}
                onChange={(e) =>
                  setQuestionType(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3"
              >
                {questionTypes.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
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
                {difficulties.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Loại đề
              </label>

              <select
                value={exerciseType}
                onChange={(e) =>
                  setExerciseType(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3"
              >
                {exerciseTypes.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Số lượng câu hỏi
              </label>

              <input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Number(e.target.value)
                  )
                }
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "AI đang tạo bài tập..."
              : "✨ AI tạo bài tập"}
          </button>
        </form>

        {generated && (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {generated.exercise.title}
                </h2>

                <p className="text-slate-500">
                  {generated.exercise.question_count} câu
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printExercise}
                  className="rounded-lg border px-4 py-2"
                >
                  🖨 Xuất PDF
                </button>

                <button
                  type="button"
                  onClick={exportWord}
                  className="rounded-lg border px-4 py-2"
                >
                  📄 Xuất Word
                </button>

                <button
                  type="button"
                  onClick={exportAnswers}
                  className="rounded-lg border px-4 py-2"
                >
                  ✓ Xuất đáp án
                </button>

                <button
                  type="button"
                  onClick={exportSolutions}
                  className="rounded-lg border px-4 py-2"
                >
                  📖 Xuất lời giải
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/teacher/exercises"
                    )
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  Hoàn thành
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {generated.questions.map(
                (question, index) => (
                  <article
                    key={question.id}
                    className="rounded-xl border p-5"
                  >
                    <div className="mb-3 font-semibold">
                      Câu {index + 1}
                    </div>

                    <div className="mb-4 text-lg">
                      {question.question}
                    </div>

                    {question.options.length > 0 && (
                      <div className="grid gap-2 md:grid-cols-2">
                        {question.options.map(
                          (option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="rounded-lg bg-slate-50 p-3"
                            >
                              {String.fromCharCode(
                                65 + optionIndex
                              )}
                              . {option}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <details className="mt-4">
                      <summary className="cursor-pointer font-medium text-blue-600">
                        Xem đáp án và lời giải
                      </summary>

                      <div className="mt-3 rounded-lg bg-green-50 p-4">
                        <p>
                          <strong>
                            Đáp án:
                          </strong>{" "}
                          {String(
                            question.answer
                          )}
                        </p>

                        <p className="mt-2">
                          <strong>
                            Lời giải:
                          </strong>{" "}
                          {question.solution}
                        </p>
                      </div>
                    </details>
                  </article>
                )
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}