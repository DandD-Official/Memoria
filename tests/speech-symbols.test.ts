import { describe, expect, it } from "vitest";
import { pronounceSymbols } from "@/lib/speech-symbols";
import { speechText } from "@/lib/speech-text";

describe("symbol pronunciation", () => {
  it.each([
    ["x ≤ 5; y ≥ 2; x ≠ y.", "x less than or equal to 5; y greater than or equal to 2; x not equal to y."],
    ["2 × 3 = 6; 6 ÷ 2 = 3", "2 times 3 equals 6; 6 divided by 2 equals 3"],
    ["π ≈ 3.14 and ΔT = 20°C", "pi approximately equal to 3.14 and delta T equals 20 degrees Celsius"],
    ["x² + y³; H₂O; x⁻¹", "x squared plus y cubed; H subscript 2 O; x to the power of minus 1"],
    ["50% & $5.50, €1 and £2", "50 percent and 5.50 dollars, 1 euro and 2 pounds"],
    ["A → B ⇒ C; n ∈ ℕ", "A goes to B implies C; n is an element of natural numbers"],
    ["x <= 5 and y >= -2; a != b", "x less than or equal to 5 and y greater than or equal to minus 2; a not equal to b"],
    ["state-of-the-art and 3–5 items", "state-of-the-art and 3 to 5 items"],
    ["one half is ½ and infinity is ∞", "one half is one half and infinity is infinity"],
    ["xⁿ and aᵢ", "x to the power of n and a subscript i"],
    ["$5, then $1,000.00.", "5 dollars, then 1,000.00 dollars."],
    ["Total: $5 + $3.", "Total: 5 dollars plus 3 dollars."],
    ["Symbols: $, €, £, @ and #3.", "Symbols: dollar sign, euro sign, pound sign, at and number 3."],
  ])("speaks %s", (source, expected) => { expect(pronounceSymbols(source)).toBe(expected); });

  it("speaks fractions, square roots and powers instead of raw TeX", () => {
    expect(pronounceSymbols("$\\frac{1}{2} + \\sqrt{9} = x^{2}$")).toBe("1 divided by 2 plus square root of 9 equals x squared");
    expect(pronounceSymbols("$\\frac{a+b}{\\frac{2}{3}}$")).toBe("open parenthesis a plus b close parenthesis divided by open parenthesis 2 divided by 3 close parenthesis");
    expect(pronounceSymbols("\\sqrt[3]{8}")).toBe("cube root of 8");
    expect(pronounceSymbols("$x^{a+b}$")).toBe("x to the power of open parenthesis a plus b close parenthesis");
  });
  it("preserves comparison symbols decoded from HTML entities", () => {
    expect(speechText("x &lt; y; 2 &#215; 3; &#960; &asymp; 3.14")).toBe("x less than y; 2 times 3; pi approximately equal to 3.14");
  });
  it("reads the formula in an MMD math block", () => {
    expect(speechText(':::math{formula="E=mc^2"}\n:::')).toBe("E equals mc squared");
    expect(speechText(':::math{formula="5"}\n:::')).toBe("5");
  });
  it("retains ordinary parenthetical prose, Greek words, and decimal values", () => {
    expect(pronounceSymbols("Read this (optional) at 3.14. καλημέρα.")).toBe("Read this (optional) at 3.14. καλημέρα.");
  });
});
