"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Frown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { quizStore, selectSummary } from "@/lib/quiz-store";
import { cn } from "@/lib/utils";

export default function Test() {
  const router = useRouter();

  const { status, activeQuestions, currentIndex, selectedOptions, results } = quizStore.useStore(state => ({
    status: state.status,
    activeQuestions: state.activeQuestions,
    currentIndex: state.currentIndex,
    selectedOptions: state.selectedOptions,
    results: state.results,
    config: state.config,
  }));

  const summary = quizStore.useStore(selectSummary);

  const question = activeQuestions[currentIndex];
  const resultMap = Object.fromEntries(results.map(item => [item.questionHash, item]));
  const loading = status === "loading";
  const answeredCount = currentIndex;
  const totalQuestions = activeQuestions.length || 1;
  const completionPercent = Math.round((answeredCount / totalQuestions) * 100);

  useEffect(() => {
    if (status === "done") {
      router.push("/summary");
    }
  }, [router, status]);

  if (!activeQuestions.length || !question) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>No test in progress</CardTitle>
          <CardDescription>Load questions and start from the welcome screen.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push("/")}>Back to welcome</Button>
        </CardFooter>
      </Card>
    );
  }

  function toggle(optionId: string) {
    quizStore.toggleOption(question, optionId);
  }

  function check() {
    quizStore.checkCurrent(question);
  }

  function next() {
    quizStore.nextQuestion();
  }

  const currentResult = resultMap[question.hash];
  const reveal = Boolean(currentResult) && currentResult?.lastAttempted !== true;

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">
            <MarkdownRenderer>{question.body}</MarkdownRenderer>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {question.answers.map(option => {
            const selected = selectedOptions[question.hash]?.includes(option.id);
            const isCorrectChoice = option.correct;
            const stateClass = reveal
              ? isCorrectChoice
                ? "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10"
                : selected
                  ? "border-rose-500/60 bg-rose-50 dark:bg-rose-500/10"
                  : "border-slate-200 dark:border-slate-800"
              : "hover:border-indigo-400";

            return (
              <div
                key={option.id}
                onClick={() => {
                  if (!reveal) {
                    toggle(option.id);
                    if (question.singleChoice) {
                      check();
                    }
                  }
                }}
                className={cn(
                  "cursor-pointer flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  "bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  stateClass,
                )}
              >
                <Checkbox checked={selected} className={cn("mt-1", question.singleChoice && "rounded-full")} />
                <span className="font-medium text-slate-800 dark:text-slate-100 select-none">
                  <MarkdownRenderer>{option.body}</MarkdownRenderer>
                </span>
              </div>
            );
          })}

          {revealStatus(reveal, currentResult)}
          <div className="flex items-center justify-end gap-2">
            {!reveal && question.singleChoice && (
              <Button variant="secondary" onClick={check} disabled={loading} className="gap-2 text-slate-500">
                I don't know
              </Button>
            )}
            {!reveal && !question.singleChoice && (
              <Button variant="secondary" onClick={check} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Check
              </Button>
            )}
            {reveal && (
              <Button onClick={next} className="gap-2">
                Next <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="flex flex-col gap-3 pb-4">
          <div className="flex w-full flex-row items-center gap-3">
            <div className="w-16 shrink-0 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">
              Progress
            </div>
            <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
              <div className={cn("h-full rounded-full bg-blue-500", completionPercent > 0 && "min-w-2")} style={{ width: `${completionPercent}%` }} />
            </div>
            <div className="w-12 shrink-0 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
              {answeredCount}/{totalQuestions}
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn("-mt-4 grid gap-2 text-center font-medium text-slate-700 dark:text-slate-200", question.singleChoice ? "grid-cols-2" : "grid-cols-3")}>
          <div className="box border-emerald-100 dark:border-emerald-500/30">
            <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-300">{summary.correct}</div>
            <div>Correct</div>
          </div>
          {!question.singleChoice && (
            <div className="box border-amber-100 dark:border-amber-500/30">
              <div className="text-lg font-semibold text-amber-600 dark:text-amber-300">{summary.partial}</div>
              <div>Partial</div>
            </div>
          )}
          <div className="box border-rose-100 dark:border-rose-500/30">
            <div className="text-lg font-semibold text-rose-600 dark:text-rose-300">{summary.incorrect}</div>
            <div>Wrong</div>
          </div>
        </CardContent>

      </Card>
    </main>
  );
}

function revealStatus(reveal: boolean, result?: { isCorrect: boolean; partial: boolean }) {
  if (!reveal || !result)
    return (
      <div className="invisible flex items-center gap-2 rounded-lgbg-slate-100 px-3 py-2 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
        <span>Not checked yet</span>
      </div>
    );
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
      {result.isCorrect && <CheckCircle2 className="size-4 text-emerald-500" />}
      {!result.isCorrect && <Frown className="size-4 text-amber-500" />}
      <span>
        {result.isCorrect && "Correct"}
        {!result.isCorrect && result.partial && "Partially correct"}
        {!result.isCorrect && !result.partial && "Incorrect"}
      </span>
    </div>
  );
}
