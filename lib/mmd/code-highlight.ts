export type CodeTokenKind = "plain" | "comment" | "string" | "keyword" | "number" | "function" | "type" | "operator";

export interface CodeToken { value: string; kind: CodeTokenKind; }

const KEYWORDS = new Set("as async await break case catch class const continue debugger default delete do else export extends finally for from function get if implements import in instanceof interface let new of package private protected public return set static super switch throw try typeof undefined var void while with yield def elif except lambda match nonlocal pass raise True False None fn pub impl mod struct enum trait use crate self type where loop move ref mut select go chan defer package map range nil func switch fallthrough interface var const select defer require end local then do done function begin rescue ensure module require echo fi foreach in".split(" "));
const TYPES = new Set("Array Boolean Date Error Map Number Object Promise Set String Symbol RegExp JSON Math Console Result Option Vec String int float bool string number boolean void any unknown never true false null".split(" "));

export function tokeniseCodeLine(line: string, language: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  // Keep the expression global rather than sticky so leading whitespace/tabs
  // are emitted as plain text before the first highlighted token.
  const pattern = /\/\/.*|\/\*.*?\*\/|#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$-]*|[+\-*\/%=!<>:&|?~^]+/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) {
    if (match.index > cursor) tokens.push({ value: line.slice(cursor, match.index), kind: "plain" });
    const value = match[0];
    let kind: CodeTokenKind = "plain";
    if (/^\/\//.test(value) || /^\/\*/.test(value) || (value.startsWith("#") && !/^#\s*!/.test(value))) kind = "comment";
    else if (/^["'`]/.test(value)) kind = "string";
    else if (/^\d/.test(value)) kind = "number";
    else if (KEYWORDS.has(value) || (language.toLowerCase() === "sql" && /^(select|from|where|join|insert|update|delete|create|table|order|group|by|as)$/i.test(value))) kind = "keyword";
    else if (TYPES.has(value)) kind = "type";
    else if (/^[+\-*\/%=!<>:&|?~^]/.test(value)) kind = "operator";
    else if (/\s*\(/.test(line.slice(match.index + value.length))) kind = "function";
    tokens.push({ value, kind });
    cursor = match.index + value.length;
  }
  if (cursor < line.length) tokens.push({ value: line.slice(cursor), kind: "plain" });
  return tokens.length ? tokens : [{ value: "", kind: "plain" }];
}
