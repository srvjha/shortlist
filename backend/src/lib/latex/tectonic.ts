import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// No imports from config/env here: the standalone compiler process must run without app secrets.

const maxLogChars = 1_000_000;
const maxPdfBytes = 10_000_000;

export type CompileError = { line: number | null; message: string; hint?: string };
export type TectonicOptions = { bin: string; onlyCached: boolean; timeoutMs: number; concurrency: number };
export type TectonicResult = { ok: true; pdf: Buffer } | { ok: false; errors: CompileError[] };

// pdfTeX-only lines common in Overleaf templates (e.g. Jake's) that break under XeTeX.
// XeTeX already embeds Unicode maps, so dropping them keeps text extractable.
const pdftexOnly = [/^\s*\\input\{glyphtounicode\}.*$/gm, /^\s*\\pdfgentounicode\s*=\s*1.*$/gm];

// Labels, references, page totals, tables of contents, citations and longtable widths are read back from the first
// run's notes. Without any of them a second run changes nothing, so it is skipped.
const usesCrossReferences =
  /\\(?:(?:page|eq|auto|name|c|v)?ref|label|cite|tableofcontents|listof\w+)\b|lastpage|longtable|totcount|zref/i;

export function needsRerun(source: string) {
  return usesCrossReferences.test(source);
}

export function makeXetexCompatible(source: string) {
  return pdftexOnly.reduce((tex, pattern) => tex.replace(pattern, "% removed: pdfTeX-only"), source);
}

const hints: [RegExp, string][] = [
  [/Misplaced alignment tab character &/, "Write \\& for a literal ampersand."],
  [/Missing \$ inserted/, "Characters like _ ^ or $ need a backslash, e.g. \\_ or \\$."],
  [/Undefined control sequence/, "A command is misspelled or its package is missing."],
  [/File `(.+)' not found/, "This package or file isn't available. Remove it or use a supported package."],
  [
    /File ended while scanning|Emergency stop|end of file/i,
    "A brace { or environment \\begin{...} is probably not closed.",
  ],
];

export function parseErrors(output: string): CompileError[] {
  const errors: CompileError[] = [];
  for (const raw of output.split("\n")) {
    const match = raw.match(/^error: (?:[^:]*\.tex:(\d+): )?(.+)$/);
    if (!match) continue;
    const message = match[2]!.trim().replace(/^!\s*/, "");
    if (/something bad happened|unrecoverable error|halted on potentially-recoverable/.test(message)) continue;
    const hint = hints.find(([pattern]) => pattern.test(message))?.[1];
    errors.push({ line: match[1] ? Number(match[1]) : null, message, ...(hint && { hint }) });
  }
  return errors.length > 0 ? errors : [{ line: null, message: "LaTeX compilation failed" }];
}

export function createTectonic(options: TectonicOptions) {
  let running = 0;
  const waiting: (() => void)[] = [];

  // Keeps concurrent compiles bounded so one busy user can't starve the CPU.
  async function withSlot<T>(task: () => Promise<T>): Promise<T> {
    if (running >= options.concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await task();
    } finally {
      running--;
      waiting.shift()?.();
    }
  }

  function run(
    cwd: string,
    rerun: boolean,
    signal?: AbortSignal,
  ): Promise<{ code: number | null; output: string; timedOut: boolean }> {
    const args = [
      "--untrusted",
      "--chatter",
      "minimal",
      ...(options.onlyCached ? ["--only-cached"] : []),
      ...(rerun ? [] : ["--reruns", "0"]),
      "main.tex",
    ];
    return new Promise((resolve, reject) => {
      const child = spawn(options.bin, args, {
        cwd,
        env: {
          PATH: process.env.PATH ?? "",
          HOME: process.env.HOME ?? cwd,
          XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      // Stops collecting once the log is full, so a document that prints forever can't fill memory.
      const collect = (chunk: Buffer) => {
        if (output.length < maxLogChars) output += chunk;
      };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, options.timeoutMs);
      signal?.addEventListener("abort", () => child.kill("SIGKILL"), { once: true });
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ code, output: output.slice(0, maxLogChars), timedOut });
      });
    });
  }

  // A signal aborts a compile nobody is waiting for (the editor sent a newer one): dropped from the queue, or
  // killed if it has started, so it never holds a slot a live request needs.
  return async function compile(source: string, signal?: AbortSignal): Promise<TectonicResult> {
    return withSlot(async () => {
      signal?.throwIfAborted();
      const dir = await mkdtemp(join(tmpdir(), "rb-tex-"));
      try {
        const tex = makeXetexCompatible(source);
        await writeFile(join(dir, "main.tex"), tex);
        const { code, output, timedOut } = await run(dir, needsRerun(tex), signal);
        signal?.throwIfAborted();
        if (timedOut) {
          return {
            ok: false,
            errors: [
              {
                line: null,
                message: "Compilation took too long and was stopped",
                hint: "Check for loops or very large content.",
              },
            ],
          };
        }
        if (code !== 0) return { ok: false, errors: parseErrors(output) };
        const pdfPath = join(dir, "main.pdf");
        if ((await stat(pdfPath)).size > maxPdfBytes) {
          return {
            ok: false,
            errors: [
              { line: null, message: "The PDF is larger than 10 MB", hint: "Shorten the content or shrink images." },
            ],
          };
        }
        return { ok: true, pdf: await readFile(pdfPath) };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  };
}
