import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const execFile = promisify(execFileCallback);
const MAX_DOCX_BYTES = 25 * 1024 * 1024;

function safeFilename(value: string | null): string {
  return (value ?? "memoria-export").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "memoria-export";
}

async function runLibreOffice(input: string, outputDirectory: string): Promise<string | null> {
  const candidates = process.platform === "win32"
    ? [
        "soffice.exe",
        join(process.env.ProgramFiles ?? "C:\\Program Files", "LibreOffice", "program", "soffice.exe"),
        join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "LibreOffice", "program", "soffice.exe"),
      ]
    : ["soffice", "libreoffice"];

  for (const executable of candidates) {
    try {
      await execFile(executable, ["--headless", "--convert-to", "pdf", "--outdir", outputDirectory, input], { windowsHide: true, timeout: 120_000 });
      const output = join(outputDirectory, `${input.split(/[\\/]/).pop()?.replace(/\.docx$/i, "") ?? "memoria-export"}.pdf`);
      await stat(output);
      return output;
    } catch {
      // Try the next installed converter.
    }
  }
  return null;
}

async function runMicrosoftWord(input: string, output: string): Promise<string | null> {
  if (process.platform !== "win32") return null;

  // Word's COM automation preserves the DOCX layout exactly and is available
  // on the Windows machines where the app is being run locally. Paths are
  // passed through the child environment rather than interpolated into code.
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$word = New-Object -ComObject Word.Application",
    "$word.Visible = $false",
    "$document = $null",
    "try {",
    "  $document = $word.Documents.Open($env:MEMORIA_DOCX_INPUT, $false, $true)",
    "  $document.SaveAs2($env:MEMORIA_PDF_OUTPUT, 17)",
    "} finally {",
    "  if ($document) { $document.Close($false) }",
    "  if ($word) { $word.Quit() }",
    "}",
  ].join("\n");

  try {
    await execFile("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
      env: { ...process.env, MEMORIA_DOCX_INPUT: input, MEMORIA_PDF_OUTPUT: output },
      windowsHide: true,
      timeout: 120_000,
    });
    await stat(output);
    return output;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = Buffer.from(await request.arrayBuffer());
  if (!body.length || body.length > MAX_DOCX_BYTES) {
    return NextResponse.json({ error: "The Word source document is empty or too large." }, { status: 400 });
  }

  const filename = safeFilename(request.headers.get("x-memoria-filename"));
  const directory = await mkdtemp(join(tmpdir(), "memoria-word-pdf-"));
  const input = join(directory, `${filename}.docx`);
  const libreOfficeOutput = join(directory, `${filename}.pdf`);

  try {
    await writeFile(input, body);
    const converted = await runLibreOffice(input, directory) ?? await runMicrosoftWord(input, libreOfficeOutput);
    if (!converted) {
      return NextResponse.json({ error: "PDF conversion requires Microsoft Word or LibreOffice installed on the machine running Memoria." }, { status: 503 });
    }
    const pdf = await readFile(converted);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
