# Persian / RTL Support & Question Formatting Rules

## 1. Option Formatting in `ask_question` and `/grill-me`
When presenting options to the user via `ask_question` (including during `/grill-me` or interactive clarifying questions):
- If an option is recommended, you MUST always place a line break (newline `\n`) immediately after `(Recommended)` before any option text or explanation.
- Example:
  ```json
  {
    "options": [
      "(Recommended)\nعنوان و متن کامل گزینه پیشنهادی...",
      "گزینه دوم..."
    ]
  }
  ```
- **STRICT MANDATE**: Never write `(Recommended)` and Persian/RTL text on the same line without a line break. Placing `(Recommended)` on its own first line ensures the English label does not trigger bidirectional layout scrambling (BiDi confusion and flipped parentheses) with Persian text.

## 2. Persian Text & Code Isolation
- Write Persian prose clearly, allowing Antigravity's Auto-Bidi engine to handle right-to-left directionality.
- Always keep code blocks, inline code, file paths, KaTeX formulas, and flags strictly in English / LTR.
