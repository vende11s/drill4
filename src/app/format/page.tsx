"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/markdown-renderer";

export default function FormatPage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Drill3Pro File Format</CardTitle>
          <CardDescription>
            Drill3Pro uses a plain text file format compatible with legacy PDS/Drill2 files, 
            but extends it with full support for Markdown and LaTeX math equations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-slate-800 dark:text-slate-200">
          
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Basic Structure</h3>
            <p>
              Question banks consist of text blocks separated by empty lines. Each block represents a single question. 
              The first lines of the block are the question body, followed by any number of answers.
            </p>
            <p>
              Answer lines must begin with a letter, a closing round bracket, and a space (e.g. <code>A) </code> or <code>B) </code>).
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Marking Correct Answers</h3>
            <p>
              Correct answers must be preceded by any number of greater-than signs (<code>&gt;</code>). 
              For consistency, it is recommended to use one or three signs (<code>&gt;</code> or <code>&gt;&gt;&gt;</code>).
            </p>
            <div className="rounded-md bg-slate-100 p-4 font-mono text-sm dark:bg-slate-900">
              Question body goes here.<br />
              A) Wrong answer<br />
              B) Another wrong answer<br />
              &gt;&gt;&gt;C) Correct answer<br />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Markdown and LaTeX Formatting</h3>
            <p>
              Drill3Pro fully supports Markdown for formatting text (bold, italics, lists, etc.) and LaTeX for rendering math equations.
            </p>
            <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <strong>Important:</strong> All LaTeX math must be explicitly wrapped in <code>$</code> for inline equations or <code>$$</code> for block equations. 
              Raw LaTeX commands (like <code>\omega</code>) without these delimiters will not be rendered correctly.
            </div>
            
            <p className="mt-4 font-medium">Example:</p>
            <div className="rounded-md bg-slate-100 p-4 font-mono text-sm dark:bg-slate-900">
              Calculate the area of a circle with radius $r$.<br />
              A) $\pi r$<br />
              &gt;&gt;&gt;B) $\pi r^2$<br />
              C) $2 \pi r$<br />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              This will render properly with LaTeX styling.
            </p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
