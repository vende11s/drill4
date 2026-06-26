import { useEffect, useRef, useState } from "react";
import { QuestionI } from "./parser/questions/question";

export type Stage = "idle" | "ready" | "testing" | "done" | "loading";
export type ScoringMode = "per-question" | "per-answer";
export type PenaltyMode = "counterbalance" | "zeroes";

type TestConfig = {
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  scoring: ScoringMode;
  penalty: PenaltyMode;
  timePerQuestion: number;
  spacedRepetition: boolean;
};

type QuestionResult = {
  questionHash: string;
  selected: string[];
  isCorrect: boolean;
  partial: boolean;
  score: number;
  lastAttempted?: boolean;
};

type QuestionStats = {
  consecutiveCorrect: number;
  targetStreak: number;
};

type QuizStoreState = {
  status: Stage;
  config: TestConfig;
  questions: QuestionI[];
  activeQuestions: QuestionI[];
  mainPool: QuestionI[];
  selectedOptions: Record<string, string[]>;
  results: QuestionResult[];
  questionStats: Record<string, QuestionStats>;
  currentIndex: number;
  fileName: string | null;
  pastedText: string;
  logs: string[];
};

type Listener = () => void;

const defaultConfig: TestConfig = {
  shuffleQuestions: true,
  shuffleAnswers: true,
  scoring: "per-answer",
  penalty: "counterbalance",
  timePerQuestion: 60,
  spacedRepetition: true,
};

const STORAGE_KEY = "quiz-store-26-01-31";

const initialState: QuizStoreState = {
  status: "idle",
  config: defaultConfig,
  questions: [],
  activeQuestions: [],
  mainPool: [],
  selectedOptions: {},
  results: [],
  questionStats: {},
  currentIndex: 0,
  fileName: null,
  pastedText: "",
  logs: [],
};

function delay(ms = 320) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function parseQuestions(text: string) {
  await delay();
  return await import("@/lib/parser/question-parser").then(mod => mod.parseQuestionsFromText(text));
}
async function loadSample() {
  await delay();
  const questions = await import("@/lib/mock-questions.json").then(mod => mod.default);
  return { questions: structuredClone(questions), log: [] };
}

let state: QuizStoreState = initialState;
const listeners = new Set<Listener>();

function readFromStorage(): QuizStoreState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuizStoreState) : null;
  } catch (error) {
    console.warn("Failed to read quiz store", error);
    return null;
  }
}

function writeToStorage(snapshot: QuizStoreState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Failed to persist quiz store", error);
  }
}

// hydrate state eagerly in browser
if (typeof window !== "undefined") {
  const stored = readFromStorage();
  if (stored) {
    state = {
      ...initialState,
      ...stored,
      config: { ...initialState.config, ...stored.config },
      logs: stored.logs ?? [],
    };
  }
}

function setState(next: QuizStoreState | ((prev: QuizStoreState) => QuizStoreState)) {
  state = typeof next === "function" ? (next as (prev: QuizStoreState) => QuizStoreState)(state) : next;
  writeToStorage(state);
  listeners.forEach(listener => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function prepareQuestions(list: QuestionI[], config: TestConfig) {
  const base = config.shuffleQuestions ? shuffleArray(list) : [...list];
  if (!config.shuffleAnswers) return base;
  return base.map(question => ({
    ...question,
    answers: shuffleArray(question.answers),
  }));
}

function computeResult(question: QuestionI, selected: string[], config: TestConfig): QuestionResult {
  const correctIds = question.answers.filter(option => option.correct).map(option => option.id);
  const good = selected.filter(id => correctIds.includes(id)).length;
  const bad = selected.filter(id => !correctIds.includes(id)).length;
  const missed = correctIds.length - good;
  const isCorrect = bad === 0 && missed === 0 && selected.length > 0;
  const partial = !isCorrect && good > 0 && bad === 0;

  let score = 0;
  if (config.scoring === "per-question") {
    if (isCorrect) {
      score = 1;
    } else if (config.penalty === "counterbalance") {
      score = Math.max(0, (good - bad) / Math.max(correctIds.length, 1));
    }
  } else {
    score = Math.max(0, good - (config.penalty === "counterbalance" ? bad : 0)) / Math.max(correctIds.length, 1);
  }

  return { questionHash: question.hash, selected, isCorrect, partial, score };
}

export const quizStore = {
  getState: () => state,
  useStore<Selected>(selector: (state: QuizStoreState) => Selected): Selected {
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    const [selected, setSelected] = useState(() => selectorRef.current(state));

    useEffect(() => {
      const listener = () => setSelected(selectorRef.current(state));
      listener();
      return subscribe(listener);
    }, []);

    return selected;
  },
  setConfig(partial: Partial<TestConfig>) {
    setState(prev => ({ ...prev, config: { ...prev.config, ...partial } }));
  },
  setPastedText(text: string) {
    setState(prev => ({ ...prev, pastedText: text }));
  },
  reset() {
    setState(initialState);
  },
  restartProgress() {
    setState(prev => ({
      ...prev,
      status: "ready",
      selectedOptions: {},
      results: [],
      currentIndex: 0,
    }));
  },
  async loadFromFile(file: File | null) {
    setState(prev => ({ ...prev, status: "loading", fileName: file?.name ?? null }));
    const { questions, log } = await parseQuestions((await file?.text()) ?? "");
    console.log("Parsed questions from file:", questions);
    setState(prev => ({
      ...prev,
      status: "ready",
      questions,
      activeQuestions: [],
      mainPool: [],
      results: [],
      selectedOptions: {},
      currentIndex: 0,
      logs: log,
    }));
    return { questions, log };
  },
  async loadFromText(text: string) {
    setState(prev => ({ ...prev, status: "loading", pastedText: text }));
    const { questions, log } = await parseQuestions(text);
    setState(prev => ({
      ...prev,
      status: "ready",
      questions,
      activeQuestions: [],
      mainPool: [],
      results: [],
      selectedOptions: {},
      currentIndex: 0,
      logs: log,
    }));
    return { questions, log };
  },
  async loadSample() {
    setState(prev => ({ ...prev, status: "loading" }));
    const { questions, log } = await loadSample();
    setState(prev => ({
      ...prev,
      status: "ready",
      questions,
      activeQuestions: [],
      mainPool: [],
      results: [],
      selectedOptions: {},
      currentIndex: 0,
      logs: log,
    }));
    return { questions, log };
  },
  async startTest() {
    setState(prev => ({ ...prev, status: "loading" }));
    if (!state.questions.length) return false;
    const prepared = prepareQuestions(state.questions, state.config);
    console.log("Prepared questions:", prepared);
    const initialStats: Record<string, QuestionStats> = {};
    prepared.forEach(q => {
      initialStats[q.hash] = { consecutiveCorrect: 0, targetStreak: state.config.spacedRepetition ? 2 : 1 };
    });

    const activeQuestions = state.config.spacedRepetition ? prepared.slice(0, 20) : prepared;
    const mainPool = state.config.spacedRepetition ? prepared.slice(20) : [];

    setState(prev => ({
      ...prev,
      status: "testing",
      activeQuestions,
      mainPool,
      selectedOptions: {},
      results: [],
      questionStats: initialStats,
      currentIndex: 0,
    }));
    return true;
  },
  toggleOption(question: QuestionI, optionId: string) {
    setState(prev => {
      const current = prev.selectedOptions[question.hash] ?? [];
      const nextSelection = question.singleChoice
        ? [optionId]
        : current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId];

      return { ...prev, selectedOptions: { ...prev.selectedOptions, [question.hash]: nextSelection } };
    });
  },
  checkCurrent(question: QuestionI) {
    const selected = state.selectedOptions[question.hash] ?? [];
    const result = computeResult(question, selected, state.config);
    setState(prev => {
      const filtered = prev.results.filter(item => item.questionHash !== question.hash);
      return { ...prev, results: [...filtered, result] };
    });
    return result;
  },
  nextQuestion() {
    setState(prev => {
      const { activeQuestions, mainPool, selectedOptions, currentIndex, results, questionStats, config } = prev;

      const currentQuestion = activeQuestions[currentIndex];
      const lastRes = results.find(r => r.questionHash === currentQuestion.hash);

      if (!lastRes) return prev;

      if (!config.spacedRepetition) {
        const nextIndex = currentIndex + 1;
        const isLast = nextIndex >= activeQuestions.length;
        return {
          ...prev,
          currentIndex: isLast ? currentIndex : nextIndex,
          status: isLast ? "done" : prev.status
        };
      }

      let nextActive = [...activeQuestions];
      let nextPool = [...mainPool];
      let nextStats = { ...(questionStats || {}) };
      const stats = nextStats[currentQuestion.hash] || { consecutiveCorrect: 0, targetStreak: 2 };

      let reinsert = false;
      let offset = 0;

      if (lastRes.isCorrect === false) {
        nextStats[currentQuestion.hash] = { consecutiveCorrect: 0, targetStreak: 2 };
        reinsert = true;
        offset = 4;
      } else {
        const newCorrectCount = stats.consecutiveCorrect + 1;
        if (newCorrectCount < stats.targetStreak) {
          nextStats[currentQuestion.hash] = { consecutiveCorrect: newCorrectCount, targetStreak: stats.targetStreak };
          reinsert = true;
          offset = 12;
        } else {
          nextStats[currentQuestion.hash] = { consecutiveCorrect: newCorrectCount, targetStreak: stats.targetStreak };
          reinsert = false;
        }
      }

      if (reinsert) {
        lastRes.lastAttempted = true;
        selectedOptions[lastRes.questionHash] = [];
        
        let questionToReinsert = currentQuestion;
        if (config.shuffleAnswers) {
          questionToReinsert = {
            ...currentQuestion,
            answers: shuffleArray(currentQuestion.answers)
          };
        }

        let insertIndex = currentIndex + offset;
        while (nextActive.length < insertIndex && nextPool.length > 0) {
          nextActive.push(nextPool.shift()!);
        }
        
        insertIndex = Math.min(insertIndex, nextActive.length);
        nextActive.splice(insertIndex, 0, questionToReinsert);
      } else {
        lastRes.lastAttempted = false;
      }

      // Ensure we have a next question if there's still stuff in the pool
      if (currentIndex + 1 >= nextActive.length && nextPool.length > 0) {
        nextActive.push(nextPool.shift()!);
      }

      const nextIndex = currentIndex + 1;
      const isLast = nextIndex >= nextActive.length;

      return {
        ...prev,
        activeQuestions: nextActive,
        mainPool: nextPool,
        questionStats: nextStats,
        currentIndex: isLast ? currentIndex : nextIndex,
        status: isLast ? "done" : prev.status
      };
    });
  },
};

export function selectSummary(state: QuizStoreState) {
  const correct = state.results.filter(item => item.isCorrect).length;
  const partial = state.results.filter(item => item.partial && !item.isCorrect).length;
  const incorrect = state.results.length - correct - partial;
  const scorePoints = state.results.reduce((acc, item) => acc + item.score, 0);
  const maxPoints = state.activeQuestions.length || state.results.length || 1;
  const scorePercent = Math.round((scorePoints / Math.max(maxPoints, 1)) * 100);
  return { correct, partial, incorrect, scorePoints, scorePercent };
}
