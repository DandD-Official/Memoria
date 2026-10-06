import { renderMathFormula } from "@/lib/mmd/math";

const symbols: Record<string, string> = {
  "+": "plus", "−": "minus", "±": "plus or minus", "∓": "minus or plus", "=": "equals",
  "≠": "not equal to", "≈": "approximately equal to", "≃": "approximately equal to", "≡": "equivalent to",
  "<": "less than", ">": "greater than", "≤": "less than or equal to", "≥": "greater than or equal to",
  "×": "times", "⋅": "times", "·": "times", "÷": "divided by", "*": "asterisk", "/": "slash",
  "%": "percent", "‰": "per mille", "&": "and", "@": "at", "#": "hash", "_": "underscore",
  "$": "dollar sign", "€": "euro sign", "£": "pound sign", "¥": "yen sign", "₹": "rupee sign",
  "°": "degrees", "√": "square root of", "∛": "cube root of", "∞": "infinity",
  "∑": "sum", "∏": "product", "∫": "integral", "∂": "partial derivative", "∇": "nabla",
  "→": "goes to", "⟶": "goes to", "←": "comes from", "⟵": "comes from", "↔": "corresponds to",
  "⇒": "implies", "⇐": "is implied by", "⇔": "if and only if", "↦": "maps to",
  "∈": "is an element of", "∉": "is not an element of", "∪": "union", "∩": "intersection",
  "⊂": "is a subset of", "⊆": "is a subset of or equal to", "⊃": "is a superset of", "∅": "empty set",
  "∧": "and", "∨": "or", "¬": "not", "∀": "for all", "∃": "there exists", "∝": "is proportional to",
  "ℕ": "natural numbers", "ℝ": "real numbers", "ℤ": "integers", "ℚ": "rational numbers", "ℂ": "complex numbers", "∴": "therefore", "∵": "because",
  "¼": "one quarter", "½": "one half", "¾": "three quarters", "⅓": "one third", "⅔": "two thirds",
  "⅛": "one eighth", "⅜": "three eighths", "⅝": "five eighths", "⅞": "seven eighths",
  "✓": "check", "✔": "check", "✗": "cross", "✘": "cross", "★": "star",
};
const greek: Record<string, string> = {
  "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon", "ζ": "zeta", "η": "eta",
  "θ": "theta", "ι": "iota", "κ": "kappa", "λ": "lambda", "μ": "mu", "ν": "nu", "ξ": "xi",
  "π": "pi", "ρ": "rho", "σ": "sigma", "τ": "tau", "υ": "upsilon", "φ": "phi", "χ": "chi", "ψ": "psi", "ω": "omega",
  "Γ": "gamma", "Δ": "delta", "Θ": "theta", "Λ": "lambda", "Π": "pi", "Σ": "sigma", "Φ": "phi", "Ψ": "psi", "Ω": "omega",
};
const superscript: Record<string, string> = Object.fromEntries(Array.from("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻").map((character, index) => [character, "0123456789+-"[index]]));
const subscript: Record<string, string> = Object.fromEntries(Array.from("₀₁₂₃₄₅₆₇₈₉₊₋").map((character, index) => [character, "0123456789+-"[index]]));
Object.assign(superscript, { "ⁱ": "i", "ⁿ": "n" });
Object.assign(subscript, { "ᵢ": "i", "ⱼ": "j", "ₐ": "a", "ₑ": "e", "ₓ": "x", "ₙ": "n" });
const power = (value: string) => value === "2" ? "squared" : value === "3" ? "cubed" : "to the power of " + value;

function argument(source: string, start: number): { text: string; end: number } | null {
  let index = start;
  while (/\s/.test(source[index] ?? "") && index < source.length) index++;
  if (source[index] === "{") {
    const beginning = ++index;
    let depth = 1;
    while (index < source.length) {
      if (source[index] === "\\") { index += 2; continue; }
      if (source[index] === "{") depth++;
      if (source[index] === "}" && --depth === 0) return { text: source.slice(beginning, index), end: index + 1 };
      index++;
    }
    return null;
  }
  const number = source.slice(index).match(/^-?\d+(?:\.\d+)?/);
  if (number) return { text: number[0], end: index + number[0].length };
  const character = Array.from(source.slice(index))[0];
  return character ? { text: character, end: index + character.length } : null;
}

/** Speak common TeX structures before converting their symbols to words. */
function latexWords(source: string, depth = 0, formula = true): string {
  if (depth > 12) return renderMathFormula(source);
  let result = "";
  const grouped = (value: string) => {
    const words = latexWords(value, depth + 1);
    return /[+\-=<>/×÷−±]|\\(?:frac|dfrac|tfrac)/.test(value) ? ` open parenthesis ${words} close parenthesis ` : words;
  };
  for (let index = 0; index < source.length;) {
    const command = source.slice(index).match(/^\\([a-zA-Z]+)/);
    if (command) {
      const name = command[1], after = index + command[0].length;
      if (["frac", "dfrac", "tfrac"].includes(name)) {
        const numerator = argument(source, after), denominator = numerator && argument(source, numerator.end);
        if (numerator && denominator) { result += ` ${grouped(numerator.text)} divided by ${grouped(denominator.text)} `; index = denominator.end; continue; }
      }
      if (name === "sqrt") {
        const root = source.slice(after).match(/^\s*\[([^\]]+)\]/);
        const value = argument(source, after + (root?.[0].length ?? 0));
        if (value) { result += ` ${!root || root[1] === "2" ? "square root" : root[1] === "3" ? "cube root" : "root " + root[1]} of ${grouped(value.text)} `; index = value.end; continue; }
      }
      if (["text", "mathrm", "mathbf", "mathit", "operatorname"].includes(name)) {
        const value = argument(source, after);
        if (value) { result += latexWords(value.text, depth + 1); index = value.end; continue; }
      }
      result += ["left", "right"].includes(name) ? "" : " " + renderMathFormula(command[0]) + " ";
      index = after; continue;
    }
    if (formula && (source[index] === "^" || source[index] === "_")) {
      const value = argument(source, index + 1);
      if (value) { result += " " + (source[index] === "^" ? power(grouped(value.text).trim()) : "subscript " + latexWords(value.text, depth + 1)) + " "; index = value.end; continue; }
    }
    if (source[index] === "\\" && source[index + 1]) { result += source[index + 1]; index += 2; continue; }
    result += source[index++];
  }
  return formula ? Array.from(result).map(character => greek[character] ? " " + greek[character] + " " : character).join("").replace(/[{}]/g, " ").replace(/\(/g, " open parenthesis ").replace(/\)/g, " close parenthesis ") : result;
}

/** Preserve punctuation for pacing, but name symbols a voice might otherwise omit. */
export function pronounceSymbols(text: string): string {
  let result = latexWords(text
    .replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g, (match, display: string | undefined, inline: string | undefined, offset: number, source: string) => {
      const value = display ?? inline ?? "";
      if (display === undefined && /^\d/.test(source.slice(offset + match.length))) return match;
      return display !== undefined || /[\\=+<>^_×÷±≤≥]|^[a-zA-Zα-ω]$|^\s*\d+(?:\.\d+)?\s*$/.test(value) ? latexWords(value) : match;
    })
    .replace(/\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g, (_, inline: string, display: string) => latexWords(inline ?? display)), 0, false)
    .replace(/([$€£¥₹])\s*(-?(?:\d+(?:,\d{3})*(?:\.\d+)?|\.\d+))/g, (_, symbol: string, amount: string) => {
      const singular = Math.abs(Number(amount.replaceAll(",", ""))) === 1;
      const unit = ({ "$": singular ? "dollar" : "dollars", "€": singular ? "euro" : "euros", "£": singular ? "pound" : "pounds", "¥": "yen", "₹": singular ? "rupee" : "rupees" })[symbol];
      return `${amount} ${unit}`;
    })
    .replace(/°\s*C\b/g, " degrees Celsius ").replace(/°\s*F\b/g, " degrees Fahrenheit ")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁱⁿ]+/g, value => " " + power(Array.from(value).map(character => superscript[character]).join("")) + " ")
    .replace(/[₀₁₂₃₄₅₆₇₈₉₊₋ᵢⱼₐₑₓₙ]+/g, value => " subscript " + Array.from(value).map(character => subscript[character]).join("") + " ")
    .replace(/\^\{([^{}]+)\}|\^(-?\d+(?:\.\d+)?|[a-zA-Z])/g, (_, group: string, value: string) => " " + power(group ?? value) + " ")
    .replace(/\b([a-zA-Z])_(\d+)\b/g, "$1 subscript $2")
    .replace(/(\d|\b[a-zA-Z])\s*\*\s*(?=\d|[a-zA-Z]\b)/g, "$1 times ")
    .replace(/(\d|\b[a-zA-Z])\s*\/\s*(?=\d|[a-zA-Z]\b)/g, "$1 divided by ")
    .replace(/(\d|\b[a-zA-Z])\s*-\s*(?=\d|[a-zA-Z]\b)/g, "$1 minus ")
    .replace(/(^|[\s=(])-(?=\d)/g, "$1minus ")
    .replace(/(\d)\s*[–—]\s*(?=\d)/g, "$1 to ")
    .replace(/!==|!=/g, " not equal to ").replace(/<=/g, " less than or equal to ").replace(/>=/g, " greater than or equal to ")
    .replace(/=>|->/g, " implies ").replace(/==+/g, " equals ")
    .replace(/#(?=\d)/g, "number ");
  result = Array.from(result).map((character, index, characters) => {
    if (symbols[character]) return " " + symbols[character] + " ";
    // Greek prose stays intact; isolated variables and TeX symbols get names.
    if (greek[character] && !/[Α-Ωα-ω]/.test(characters[index - 1] ?? "") && !/[Α-Ωα-ω]/.test(characters[index + 1] ?? "")) return " " + greek[character] + " ";
    return character;
  }).join("");
  return result.replace(/[^\S\n]+/g, " ").replace(/ +([.,;:!?])/g, "$1").replace(/ *\n */g, "\n").trim();
}
