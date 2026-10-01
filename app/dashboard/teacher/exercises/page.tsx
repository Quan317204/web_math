'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

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

type QuestionType =
  | 'multiple_choice'
  | 'fill_number'
  | 'fill_expression'
  | 'input_answer'
  | 'real_world'
  | 'critical_thinking';

type Question = {
  type: QuestionType;
  content: string;
  options: string[];
  correctAnswer: string;
  solution: string;
  points: number;
};

type BankQuestion = {
  id: string;

  type: QuestionType;

  content: string;

  difficulty: string | null;

  content_data?: {
    options?: string[];
  } | null;

  correct_answer?: {
    value?: string;
  } | null;

  solution?: string | null;

  grades?: {
    name: string;
  } | null;

  chapters?: {
    name: string;
  } | null;

  topics?: {
    name: string;
  } | null;
};

type Exercise = {
  id: string;
  title: string;
  exercise_type: string;
  difficulty: string | null;
  question_count: number;
  created_at: string;

  grades: {
    name: string;
  };

  chapters?: {
    name: string;
  } | null;

  topics?: {
    name: string;
  } | null;

  _count: {
    exercise_questions: number;
    assignments: number;
  };
};

const emptyQuestion = (): Question => ({
  type: 'multiple_choice',
  content: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  solution: '',
  points: 1,
});

function getQuestionTypeLabel(type: QuestionType) {
  switch (type) {
    case 'multiple_choice':
      return 'Trắc nghiệm';

    case 'fill_number':
      return 'Điền số';

    case 'fill_expression':
      return 'Điền biểu thức';

    case 'input_answer':
      return 'Nhập đáp án';

    case 'real_world':
      return 'Bài toán thực tế';

    case 'critical_thinking':
      return 'Tư duy';

    default:
      return type;
  }
}

function getDifficultyLabel(
  difficulty: string | null | undefined
) {
  switch (difficulty) {
    case 'easy':
      return 'Dễ';

    case 'medium':
      return 'Trung bình';

    case 'hard':
      return 'Khó';

    case 'mixed':
      return 'Hỗn hợp';

    default:
      return difficulty || '-';
  }
}

export default function TeacherExercisesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [exercises, setExercises] =
    useState<Exercise[]>([]);

  // ====================================================
  // CREATE MODE
  // ====================================================

  const [createMode, setCreateMode] = useState<
    'manual' | 'bank'
  >('manual');

  // ====================================================
  // BASIC INFORMATION
  // ====================================================

  const [title, setTitle] = useState('');

  const [exerciseType, setExerciseType] =
    useState('practice');

  const [gradeId, setGradeId] = useState('');

  const [chapterId, setChapterId] =
    useState('');

  const [topicId, setTopicId] =
    useState('');

  const [difficulty, setDifficulty] =
    useState('medium');

  // ====================================================
  // MANUAL QUESTIONS
  // ====================================================

  const [questions, setQuestions] =
    useState<Question[]>([
      emptyQuestion(),
    ]);

  // ====================================================
  // QUESTION BANK
  // ====================================================

  const [bankQuestions, setBankQuestions] =
    useState<BankQuestion[]>([]);

  const [selectedQuestionIds, setSelectedQuestionIds] =
    useState<string[]>([]);

  const [bankType, setBankType] =
    useState('');

  const [bankDifficulty, setBankDifficulty] =
    useState('');

  const [bankSearch, setBankSearch] =
    useState('');

  const [loadingBank, setLoadingBank] =
    useState(false);

  const [bankLoaded, setBankLoaded] =
    useState(false);

  // ====================================================
  // COMMON STATE
  // ====================================================

  const [loading, setLoading] =
    useState(false);

  const [loadingData, setLoadingData] =
    useState(true);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  // ====================================================
  // LOAD DATA
  // ====================================================

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadingData(true);
      setError('');

      const response = await fetch(
        '/api/teachers/exercises'
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Không thể tải dữ liệu'
        );
      }

      setGrades(data.grades || []);
      setExercises(data.exercises || []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải dữ liệu'
      );
    } finally {
      setLoadingData(false);
    }
  }

  // ====================================================
  // SELECT DATA
  // ====================================================

  const selectedGrade = grades.find(
    (grade) => grade.id === gradeId
  );

  const chapters =
    selectedGrade?.chapters || [];

  const selectedChapter =
    chapters.find(
      (chapter) =>
        chapter.id === chapterId
    );

  const topics =
    selectedChapter?.topics || [];

  function handleGradeChange(
    value: string
  ) {
    setGradeId(value);
    setChapterId('');
    setTopicId('');

    setBankQuestions([]);
    setSelectedQuestionIds([]);
    setBankLoaded(false);
  }

  function handleChapterChange(
    value: string
  ) {
    setChapterId(value);
    setTopicId('');

    setBankQuestions([]);
    setSelectedQuestionIds([]);
    setBankLoaded(false);
  }

  function handleTopicChange(
    value: string
  ) {
    setTopicId(value);

    setBankQuestions([]);
    setSelectedQuestionIds([]);
    setBankLoaded(false);
  }

  // ====================================================
  // LOAD QUESTION BANK
  // ====================================================

  async function loadBankQuestions() {
    if (!gradeId) {
      setError('Vui lòng chọn khối');
      return;
    }

    if (!chapterId) {
      setError('Vui lòng chọn chương');
      return;
    }

    if (!topicId) {
      setError('Vui lòng chọn chủ đề');
      return;
    }

    try {
      setLoadingBank(true);
      setError('');

      const params =
        new URLSearchParams();

      params.set('gradeId', gradeId);
      params.set('chapterId', chapterId);
      params.set('topicId', topicId);

      if (bankType) {
        params.set('type', bankType);
      }

      if (bankDifficulty) {
        params.set(
          'difficulty',
          bankDifficulty
        );
      }

      if (bankSearch.trim()) {
        params.set(
          'search',
          bankSearch.trim()
        );
      }

      const response = await fetch(
        `/api/questions?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Không thể tải ngân hàng câu hỏi'
        );
      }

      setBankQuestions(
        Array.isArray(data.questions)
          ? data.questions
          : []
      );

      setBankLoaded(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Không thể tải ngân hàng câu hỏi'
      );
    } finally {
      setLoadingBank(false);
    }
  }

  // ====================================================
  // QUESTION BANK SELECTION
  // ====================================================

  function toggleQuestion(
    questionId: string
  ) {
    setSelectedQuestionIds(
      (current) => {
        if (
          current.includes(questionId)
        ) {
          return current.filter(
            (id) => id !== questionId
          );
        }

        return [
          ...current,
          questionId,
        ];
      }
    );
  }

  function selectAllBankQuestions() {
    setSelectedQuestionIds(
      bankQuestions.map(
        (question) => question.id
      )
    );
  }

  function clearAllBankQuestions() {
    setSelectedQuestionIds([]);
  }

  const allBankQuestionsSelected =
    bankQuestions.length > 0 &&
    bankQuestions.every((question) =>
      selectedQuestionIds.includes(
        question.id
      )
    );

  const selectedBankQuestions =
    useMemo(() => {
      return bankQuestions.filter(
        (question) =>
          selectedQuestionIds.includes(
            question.id
          )
      );
    }, [
      bankQuestions,
      selectedQuestionIds,
    ]);

  // ====================================================
  // MANUAL QUESTIONS
  // ====================================================

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      emptyQuestion(),
    ]);
  }

  function removeQuestion(
    index: number
  ) {
    if (questions.length === 1) {
      return;
    }

    setQuestions((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  function updateQuestion(
    index: number,
    field: keyof Question,
    value:
      | string
      | number
      | string[]
  ) {
    setQuestions((current) =>
      current.map(
        (question, i) => {
          if (i !== index) {
            return question;
          }

          return {
            ...question,
            [field]: value,
          };
        }
      )
    );
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    value: string
  ) {
    setQuestions((current) =>
      current.map(
        (question, i) => {
          if (
            i !== questionIndex
          ) {
            return question;
          }

          const options = [
            ...question.options,
          ];

          options[optionIndex] =
            value;

          return {
            ...question,
            options,
          };
        }
      )
    );
  }

  function addOption(
    questionIndex: number
  ) {
    setQuestions((current) =>
      current.map(
        (question, i) => {
          if (
            i !== questionIndex
          ) {
            return question;
          }

          return {
            ...question,
            options: [
              ...question.options,
              '',
            ],
          };
        }
      )
    );
  }

  function removeOption(
    questionIndex: number,
    optionIndex: number
  ) {
    setQuestions((current) =>
      current.map(
        (question, i) => {
          if (
            i !== questionIndex
          ) {
            return question;
          }

          if (
            question.options.length <=
            2
          ) {
            return question;
          }

          const options =
            question.options.filter(
              (_, index) =>
                index !== optionIndex
            );

          return {
            ...question,
            options,
          };
        }
      )
    );
  }

  // ====================================================
  // VALIDATE MANUAL QUESTIONS
  // ====================================================

  function validateQuestions() {
    for (
      let i = 0;
      i < questions.length;
      i++
    ) {
      const question =
        questions[i];

      if (
        !question.content.trim()
      ) {
        setError(
          `Vui lòng nhập nội dung cho câu ${
            i + 1
          }`
        );

        return false;
      }

      if (
        !question.correctAnswer.trim()
      ) {
        setError(
          `Vui lòng nhập đáp án đúng cho câu ${
            i + 1
          }`
        );

        return false;
      }

      if (question.points <= 0) {
        setError(
          `Điểm của câu ${
            i + 1
          } phải lớn hơn 0`
        );

        return false;
      }

      if (
        question.type ===
        'multiple_choice'
      ) {
        const validOptions =
          question.options.filter(
            (option) =>
              option.trim() !== ''
          );

        if (
          validOptions.length < 2
        ) {
          setError(
            `Câu ${
              i + 1
            } phải có ít nhất 2 phương án`
          );

          return false;
        }
      }
    }

    return true;
  }

  // ====================================================
  // RESET FORM
  // ====================================================

  function resetForm() {
    setTitle('');
    setGradeId('');
    setChapterId('');
    setTopicId('');
    setExerciseType('practice');
    setDifficulty('medium');

    setQuestions([
      emptyQuestion(),
    ]);

    setBankQuestions([]);
    setSelectedQuestionIds([]);
    setBankType('');
    setBankDifficulty('');
    setBankSearch('');
    setBankLoaded(false);

    setCreateMode('manual');
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!title.trim()) {
      setError(
        'Vui lòng nhập tên bài tập'
      );
      return;
    }

    if (!gradeId) {
      setError('Vui lòng chọn khối');
      return;
    }

    if (!chapterId) {
      setError(
        'Vui lòng chọn chương'
      );
      return;
    }

    if (!topicId) {
      setError(
        'Vui lòng chọn chủ đề'
      );
      return;
    }

    if (
      createMode === 'manual'
    ) {
      if (!validateQuestions()) {
        return;
      }
    } else {
      if (
        selectedQuestionIds.length ===
        0
      ) {
        setError(
          'Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng'
        );
        return;
      }
    }

    try {
      setLoading(true);

      const body =
        createMode === 'manual'
          ? {
              title: title.trim(),
              exerciseType,
              gradeId,
              chapterId,
              topicId,
              difficulty,
              source: 'manual',
              questions,
            }
          : {
              title: title.trim(),
              exerciseType,
              gradeId,
              chapterId,
              topicId,
              difficulty,
              source: 'bank',
              questionIds:
                selectedQuestionIds,
            };

      const response = await fetch(
        '/api/teachers/exercises',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Tạo bài tập thất bại'
        );
      }

      setMessage(
        createMode === 'bank'
          ? `Tạo bài tập từ ngân hàng thành công với ${selectedQuestionIds.length} câu hỏi!`
          : 'Tạo bài tập thành công!'
      );

      resetForm();

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Tạo bài tập thất bại'
      );
    } finally {
      setLoading(false);
    }
  }

  // ====================================================
  // LOADING
  // ====================================================

  if (loadingData) {
    return (
      <main className="p-8">
        <p>
          Đang tải dữ liệu...
        </p>
      </main>
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard/teacher"
              className="text-sm text-gray-500 hover:text-blue-600"
            >
              ← Teacher Portal
            </Link>

            <h1 className="text-3xl font-bold text-gray-900">
              Tạo bài tập
            </h1>

            <p className="mt-2 text-gray-600">
              Tạo bài tập thủ công hoặc
              chọn câu hỏi từ ngân hàng.
            </p>
          </div>

          <Link
            href="/dashboard/teacher/assignments"
            className="rounded-lg bg-green-600 px-5 py-3 text-center font-medium text-white hover:bg-green-700"
          >
            Quản lý giao bài
          </Link>
        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* BASIC INFORMATION */}

          <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">
              Thông tin bài tập
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              {/* TITLE */}

              <div className="md:col-span-2">
                <label className="mb-2 block font-medium">
                  Tên bài tập
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="Ví dụ: Phép cộng phân số"
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              {/* TYPE */}

              <div>
                <label className="mb-2 block font-medium">
                  Loại bài tập
                </label>

                <select
                  value={exerciseType}
                  onChange={(e) =>
                    setExerciseType(
                      e.target.value
                    )
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

              {/* DIFFICULTY */}

              <div>
                <label className="mb-2 block font-medium">
                  Độ khó
                </label>

                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="easy">
                    Dễ
                  </option>

                  <option value="medium">
                    Trung bình
                  </option>

                  <option value="hard">
                    Khó
                  </option>

                  <option value="mixed">
                    Hỗn hợp
                  </option>
                </select>
              </div>

              {/* GRADE */}

              <div>
                <label className="mb-2 block font-medium">
                  Khối
                </label>

                <select
                  value={gradeId}
                  onChange={(e) =>
                    handleGradeChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="">
                    -- Chọn khối --
                  </option>

                  {grades.map(
                    (grade) => (
                      <option
                        key={grade.id}
                        value={grade.id}
                      >
                        {grade.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* CHAPTER */}

              <div>
                <label className="mb-2 block font-medium">
                  Chương
                </label>

                <select
                  value={chapterId}
                  onChange={(e) =>
                    handleChapterChange(
                      e.target.value
                    )
                  }
                  disabled={!gradeId}
                  className="w-full rounded-lg border px-4 py-3 disabled:bg-gray-100"
                >
                  <option value="">
                    -- Chọn chương --
                  </option>

                  {chapters.map(
                    (chapter) => (
                      <option
                        key={chapter.id}
                        value={chapter.id}
                      >
                        {chapter.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* TOPIC */}

              <div className="md:col-span-2">
                <label className="mb-2 block font-medium">
                  Chủ đề
                </label>

                <select
                  value={topicId}
                  onChange={(e) =>
                    handleTopicChange(
                      e.target.value
                    )
                  }
                  disabled={!chapterId}
                  className="w-full rounded-lg border px-4 py-3 disabled:bg-gray-100"
                >
                  <option value="">
                    -- Chọn chủ đề --
                  </option>

                  {topics.map(
                    (topic) => (
                      <option
                        key={topic.id}
                        value={topic.id}
                      >
                        {topic.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* ==================================================
              CREATE MODE
          ================================================== */}

          <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-semibold">
              Nguồn câu hỏi
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              {/* MANUAL */}

              <button
                type="button"
                onClick={() =>
                  setCreateMode(
                    'manual'
                  )
                }
                className={`rounded-xl border-2 p-6 text-left transition ${
                  createMode ===
                  'manual'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="mb-2 text-3xl">
                  ✏️
                </div>

                <h3 className="text-lg font-semibold">
                  Tự tạo câu hỏi
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Tự nhập nội dung,
                  phương án, đáp án và
                  lời giải.
                </p>
              </button>

              {/* BANK */}

              <button
                type="button"
                onClick={() =>
                  setCreateMode(
                    'bank'
                  )
                }
                className={`rounded-xl border-2 p-6 text-left transition ${
                  createMode ===
                  'bank'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="mb-2 text-3xl">
                  📚
                </div>

                <h3 className="text-lg font-semibold">
                  Ngân hàng câu hỏi
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Chọn các câu hỏi đã
                  có sẵn trong ngân
                  hàng.
                </p>
              </button>
            </div>
          </section>

          {/* ==================================================
              QUESTION BANK
          ================================================== */}

          {createMode ===
            'bank' && (
            <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">

              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    📚 Ngân hàng câu hỏi
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Lọc và chọn các câu
                    hỏi muốn đưa vào bài
                    tập.
                  </p>
                </div>

                <div className="rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
                  Đã chọn:{' '}
                  {selectedQuestionIds.length}{' '}
                  câu
                </div>
              </div>

              {/* FILTER */}

              <div className="mb-6 grid gap-4 md:grid-cols-3">

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Loại câu hỏi
                  </label>

                  <select
                    value={bankType}
                    onChange={(e) =>
                      setBankType(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-4 py-3"
                  >
                    <option value="">
                      Tất cả
                    </option>

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

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Độ khó câu hỏi
                  </label>

                  <select
                    value={bankDifficulty}
                    onChange={(e) =>
                      setBankDifficulty(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-4 py-3"
                  >
                    <option value="">
                      Tất cả
                    </option>

                    <option value="easy">
                      Dễ
                    </option>

                    <option value="medium">
                      Trung bình
                    </option>

                    <option value="hard">
                      Khó
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tìm kiếm
                  </label>

                  <input
                    value={bankSearch}
                    onChange={(e) =>
                      setBankSearch(
                        e.target.value
                      )
                    }
                    placeholder="Nhập nội dung câu hỏi..."
                    className="w-full rounded-lg border px-4 py-3"
                  />
                </div>
              </div>

              {/* LOAD BUTTON */}

              <div className="mb-6 flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={
                    loadBankQuestions
                  }
                  disabled={
                    loadingBank
                  }
                  className="rounded-lg bg-purple-600 px-5 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingBank
                    ? 'Đang tải...'
                    : '🔍 Tìm câu hỏi'}
                </button>

                {bankQuestions.length >
                  0 && (
                  <>
                    <button
                      type="button"
                      onClick={
                        selectAllBankQuestions
                      }
                      disabled={
                        allBankQuestionsSelected
                      }
                      className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      Chọn tất cả
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearAllBankQuestions
                      }
                      className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </>
                )}
              </div>

              {/* NO DATA */}

              {bankLoaded &&
                bankQuestions.length ===
                  0 && (
                  <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
                    Không tìm thấy câu hỏi
                    phù hợp.
                  </div>
                )}

              {/* QUESTION LIST */}

              <div className="space-y-4">

                {bankQuestions.map(
                  (
                    question,
                    index
                  ) => {
                    const selected =
                      selectedQuestionIds.includes(
                        question.id
                      );

                    const options =
                      question
                        .content_data
                        ?.options ||
                      [];

                    const correctAnswer =
                      question
                        .correct_answer
                        ?.value ||
                      '';

                    return (
                      <div
                        key={
                          question.id
                        }
                        onClick={() =>
                          toggleQuestion(
                            question.id
                          )
                        }
                        className={`cursor-pointer rounded-xl border-2 p-5 transition ${
                          selected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-purple-300'
                        }`}
                      >

                        <div className="flex gap-4">

                          {/* CHECKBOX */}

                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={
                                selected
                              }
                              onChange={() =>
                                toggleQuestion(
                                  question.id
                                )
                              }
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                              className="h-5 w-5"
                            />
                          </div>

                          {/* CONTENT */}

                          <div className="min-w-0 flex-1">

                            <div className="mb-3 flex flex-wrap items-center gap-2">

                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                                Câu{' '}
                                {index +
                                  1}
                              </span>

                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                                {getQuestionTypeLabel(
                                  question.type
                                )}
                              </span>

                              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                                {getDifficultyLabel(
                                  question.difficulty
                                )}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap font-medium text-gray-900">
                              {
                                question.content
                              }
                            </p>

                            {/* OPTIONS */}

                            {question.type ===
                              'multiple_choice' &&
                              options.length >
                                0 && (
                                <div className="mt-4 grid gap-2 md:grid-cols-2">
                                  {options.map(
                                    (
                                      option,
                                      optionIndex
                                    ) => (
                                      <div
                                        key={
                                          optionIndex
                                        }
                                        className={`rounded-lg border p-3 text-sm ${
                                          String.fromCharCode(
                                            65 +
                                              optionIndex
                                          ) ===
                                          correctAnswer
                                            ? 'border-green-300 bg-green-50 font-medium'
                                            : 'border-gray-200 bg-gray-50'
                                        }`}
                                      >
                                        <span className="mr-2 font-semibold">
                                          {String.fromCharCode(
                                            65 +
                                              optionIndex
                                          )}
                                          .
                                        </span>

                                        {
                                          option
                                        }
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>
                                Đáp án:{' '}
                                <strong className="text-green-600">
                                  {
                                    correctAnswer
                                  }
                                </strong>
                              </span>

                              {question
                                .topics
                                ?.name && (
                                <span>
                                  Chủ đề:{' '}
                                  {
                                    question
                                      .topics
                                      .name
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* SELECTED SUMMARY */}

              {selectedBankQuestions.length >
                0 && (
                <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50 p-5">

                  <h3 className="font-semibold text-purple-900">
                    Các câu đã chọn
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedBankQuestions.map(
                      (
                        question,
                        index
                      ) => (
                        <span
                          key={
                            question.id
                          }
                          className="rounded-full bg-white px-3 py-1 text-sm text-purple-700"
                        >
                          {index + 1}.
                          {' '}
                          {question.content.slice(
                            0,
                            50
                          )}
                          {question.content
                            .length > 50
                            ? '...'
                            : ''}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              MANUAL QUESTIONS
          ================================================== */}

          {createMode ===
            'manual' && (
            <section className="mb-8">

              <div className="mb-5 flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-semibold">
                    Câu hỏi
                  </h2>

                  <p className="text-sm text-gray-500">
                    Tổng số câu:{' '}
                    {questions.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addQuestion
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  + Thêm câu hỏi
                </button>
              </div>

              <div className="space-y-6">

                {questions.map(
                  (
                    question,
                    index
                  ) => (
                    <div
                      key={index}
                      className="rounded-xl bg-white p-6 shadow-sm"
                    >

                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Câu{' '}
                          {index + 1}
                        </h3>

                        {questions.length >
                          1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeQuestion(
                                index
                              )
                            }
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Xóa câu
                          </button>
                        )}
                      </div>

                      {/* TYPE */}

                      <div className="mb-4">
                        <label className="mb-2 block font-medium">
                          Loại câu hỏi
                        </label>

                        <select
                          value={
                            question.type
                          }
                          onChange={(
                            e
                          ) =>
                            updateQuestion(
                              index,
                              'type',
                              e.target
                                .value
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

                      {/* CONTENT */}

                      <div className="mb-4">
                        <label className="mb-2 block font-medium">
                          Nội dung câu hỏi
                        </label>

                        <textarea
                          value={
                            question.content
                          }
                          onChange={(
                            e
                          ) =>
                            updateQuestion(
                              index,
                              'content',
                              e.target
                                .value
                            )
                          }
                          rows={4}
                          placeholder="Nhập nội dung câu hỏi..."
                          className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* OPTIONS */}

                      {question.type ===
                        'multiple_choice' && (
                        <div className="mb-4">

                          <div className="mb-2 flex items-center justify-between">
                            <label className="font-medium">
                              Các phương án
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                addOption(
                                  index
                                )
                              }
                              className="text-sm text-blue-600 hover:text-blue-700"
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
                                  key={
                                    optionIndex
                                  }
                                  className="flex gap-2"
                                >
                                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 font-semibold">
                                    {String.fromCharCode(
                                      65 +
                                        optionIndex
                                    )}
                                  </span>

                                  <input
                                    value={
                                      option
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateOption(
                                        index,
                                        optionIndex,
                                        e
                                          .target
                                          .value
                                      )
                                    }
                                    placeholder={`Phương án ${
                                      optionIndex +
                                      1
                                    }`}
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
                                      className="px-3 text-red-500 hover:text-red-700"
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

                      {/* CORRECT ANSWER */}

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
                            onChange={(
                              e
                            ) =>
                              updateQuestion(
                                index,
                                'correctAnswer',
                                e.target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border px-4 py-3"
                          >
                            <option value="">
                              -- Chọn đáp án --
                            </option>

                            {question.options.map(
                              (
                                _,
                                optionIndex
                              ) => (
                                <option
                                  key={
                                    optionIndex
                                  }
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
                            onChange={(
                              e
                            ) =>
                              updateQuestion(
                                index,
                                'correctAnswer',
                                e.target
                                  .value
                              )
                            }
                            placeholder="Nhập đáp án đúng"
                            className="w-full rounded-lg border px-4 py-3"
                          />
                        )}
                      </div>

                      {/* SOLUTION */}

                      <div className="mb-4">
                        <label className="mb-2 block font-medium">
                          Lời giải
                        </label>

                        <textarea
                          value={
                            question.solution
                          }
                          onChange={(
                            e
                          ) =>
                            updateQuestion(
                              index,
                              'solution',
                              e.target
                                .value
                            )
                          }
                          rows={3}
                          placeholder="Nhập lời giải..."
                          className="w-full rounded-lg border px-4 py-3"
                        />
                      </div>

                      {/* POINT */}

                      <div className="max-w-xs">
                        <label className="mb-2 block font-medium">
                          Điểm
                        </label>

                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={
                            question.points
                          }
                          onChange={(
                            e
                          ) =>
                            updateQuestion(
                              index,
                              'points',
                              Number(
                                e.target
                                  .value
                              )
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
          )}

          {/* ==================================================
              SUBMIT
          ================================================== */}

          <div className="mb-12 flex justify-end">

            <button
              type="submit"
              disabled={loading}
              className={`rounded-lg px-8 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                createMode ===
                'bank'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading
                ? 'Đang tạo...'
                : createMode ===
                    'bank'
                  ? `Tạo bài tập từ ${selectedQuestionIds.length} câu`
                  : 'Tạo bài tập'}
            </button>
          </div>
        </form>

        {/* ==================================================
            EXISTING EXERCISES
        ================================================== */}

        <section className="rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Bài tập đã tạo
            </h2>

            <p className="text-sm text-gray-500">
              Các bài tập do bạn tạo
            </p>
          </div>

          {exercises.length ===
          0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
              Chưa có bài tập nào.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">

                    <th className="px-4 py-3">
                      Bài tập
                    </th>

                    <th className="px-4 py-3">
                      Khối
                    </th>

                    <th className="px-4 py-3">
                      Chủ đề
                    </th>

                    <th className="px-4 py-3">
                      Số câu
                    </th>

                    <th className="px-4 py-3">
                      Loại
                    </th>

                    <th className="px-4 py-3">
                      Đã giao
                    </th>

                    <th className="px-4 py-3">
                      Thao tác
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {exercises.map(
                    (exercise) => (
                      <tr
                        key={
                          exercise.id
                        }
                        className="border-b last:border-0"
                      >

                        <td className="px-4 py-4 font-medium">
                          {
                            exercise.title
                          }
                        </td>

                        <td className="px-4 py-4">
                          {
                            exercise
                              .grades
                              .name
                          }
                        </td>

                        <td className="px-4 py-4">
                          {
                            exercise
                              .topics
                              ?.name ||
                            '-'
                          }
                        </td>

                        <td className="px-4 py-4">
                          {
                            exercise.question_count
                          }
                        </td>

                        <td className="px-4 py-4">
                          {
                            exercise.exercise_type
                          }
                        </td>

                        <td className="px-4 py-4">
                          {
                            exercise._count
                              .assignments
                          }
                        </td>

                        <td className="px-4 py-4">

                          <div className="flex flex-wrap gap-2">

                            <Link
                              href={`/dashboard/teacher/exercises/${exercise.id}/edit`}
                              className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                            >
                              Xem / Sửa
                            </Link>

                            <Link
                              href={`/dashboard/teacher/exercises/${exercise.id}/assign`}
                              className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-100"
                            >
                              Giao bài
                            </Link>

                          </div>

                        </td>
                      </tr>
                    )
                  )}

                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}