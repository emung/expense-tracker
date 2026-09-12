/**
 * Safe evaluator for the arithmetic people used to type into spreadsheet cells, e.g. `-88,74+38.99`.
 * Supports + - * /, parentheses, unary minus and both `,` and `.` as decimal separator. Never uses eval.
 */

export type EvaluationResult = { ok: true; value: number } | { ok: false; error: string };

type Operator = '+' | '-' | '*' | '/';
type Token = { kind: 'number'; value: number; text: string } | { kind: 'operator'; value: Operator } | { kind: 'paren'; value: '(' | ')' };

const MAX_LENGTH = 200;
const NUMBER = /^\d+(?:[.,]\d+)?/;

class ExpressionError extends Error {}

export function evaluateExpression(input: string): EvaluationResult {
  const text = input.trim();
  if (text === '') {
    return { ok: false, error: 'Introduceți o sumă.' };
  }
  if (text.length > MAX_LENGTH) {
    return { ok: false, error: 'Formula este prea lungă.' };
  }
  try {
    const parser = new Parser(tokenize(text));
    const value = parser.parse();
    if (!Number.isFinite(value)) {
      throw new ExpressionError('Rezultatul nu este un număr valid.');
    }
    return { ok: true, value: roundToCents(value) };
  } catch (error) {
    if (error instanceof ExpressionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

/** True when the input is a formula rather than a single (optionally negative) number. */
export function isFormula(input: string): boolean {
  return /[+*/()]/.test(input) || /[\d)]\s*-/.test(input);
}

/** Round half away from zero to 2 decimals, so -49.745 -> -49.75 like 49.745 -> 49.75. */
export function roundToCents(value: number): number {
  const rounded = (Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
  return rounded === 0 ? 0 : rounded;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text.charAt(index);
    if (/\s/.test(char)) {
      index++;
    } else if (/\d/.test(char)) {
      const match = NUMBER.exec(text.slice(index));
      const literal = match?.[0] ?? '';
      index += literal.length;
      // Rejects "1..2", "1.234,56" and other thousands separators instead of guessing.
      if (/[\d.,]/.test(text.charAt(index))) {
        throw new ExpressionError(`Număr invalid lângă „${literal}${text.charAt(index)}”. Folosiți cel mult o virgulă zecimală.`);
      }
      tokens.push({ kind: 'number', value: Number(literal.replace(',', '.')), text: literal });
    } else if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ kind: 'operator', value: char });
      index++;
    } else if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      index++;
    } else {
      throw new ExpressionError(`Caracter nepermis: „${char}”.`);
    }
  }
  return tokens;
}

/** expr := term (('+'|'-') term)* ; term := unary (('*'|'/') unary)* ; unary := ('+'|'-') unary | primary */
class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const value = this.expression();
    const extra = this.peek();
    if (extra) {
      throw new ExpressionError(extra.kind === 'paren' && extra.value === ')' ? 'Paranteză închisă în plus.' : `Simbol neașteptat: „${describe(extra)}”.`);
    }
    return value;
  }

  private expression(): number {
    let value = this.term();
    for (let token = this.peek(); token?.kind === 'operator' && (token.value === '+' || token.value === '-'); token = this.peek()) {
      this.position++;
      value = token.value === '+' ? value + this.term() : value - this.term();
    }
    return value;
  }

  private term(): number {
    let value = this.unary();
    for (let token = this.peek(); token?.kind === 'operator' && (token.value === '*' || token.value === '/'); token = this.peek()) {
      this.position++;
      const right = this.unary();
      if (token.value === '/' && right === 0) {
        throw new ExpressionError('Împărțire la zero.');
      }
      value = token.value === '*' ? value * right : value / right;
    }
    return value;
  }

  private unary(): number {
    const token = this.peek();
    if (token?.kind === 'operator' && (token.value === '+' || token.value === '-')) {
      this.position++;
      const operand = this.unary();
      return token.value === '-' ? -operand : operand;
    }
    return this.primary();
  }

  private primary(): number {
    const token = this.peek();
    if (!token) {
      throw new ExpressionError('Formula este incompletă.');
    }
    this.position++;
    if (token.kind === 'number') {
      return token.value;
    }
    if (token.kind === 'paren' && token.value === '(') {
      const value = this.expression();
      const closing = this.peek();
      if (closing?.kind !== 'paren' || closing.value !== ')') {
        throw new ExpressionError('Lipsește o paranteză închisă.');
      }
      this.position++;
      return value;
    }
    throw new ExpressionError(`Simbol neașteptat: „${describe(token)}”.`);
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }
}

function describe(token: Token): string {
  return token.kind === 'number' ? token.text : token.value;
}
