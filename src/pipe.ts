export function pipe<T, U>(value: T, op1: (t: T) => U): U;
export function pipe<T, A, U>(value: T, op1: (t: T) => A, op2: (a: A) => U): U;
export function pipe<T, A, B, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => U
): U;
export function pipe<T, A, B, C, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => U
): U;
export function pipe<T, A, B, C, D, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => U
): U;
export function pipe<T, A, B, C, D, E, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => U
): U;
export function pipe<T, A, B, C, D, E, F, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => U
): U;
export function pipe<T, A, B, C, D, E, F, G, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => G,
  op8: (g: G) => U
): U;
export function pipe<T, A, B, C, D, E, F, G, H, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => G,
  op8: (g: G) => H,
  op9: (h: H) => U
): U;
export function pipe<T, A, B, C, D, E, F, G, H, I, U>(
  value: T,
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => G,
  op8: (g: G) => H,
  op9: (h: H) => I,
  op10: (i: I) => U
): U;

/**
 * Recursively value of the first parameter `input` into the functions `opN`.
 *
 * @param input The input to pass into the piped functions.
 * @param opN The functions to pipe results through.
 *
 * ```typescript
 * const double = (x: number) => x * 2;
 *
 * expect(pipe(1, double, double, double, double)).toEqual(16);
 * ```
 */
export function pipe(input: any, ...opN: Array<(t: any) => any>) {
  return pipeRaw(input, ...opN);
}

function pipeRaw(input: any, ...opN: Array<(t: any) => any>) {
  return opN.reduce((t, op) => op(t), input);
}

export function pipeline<T, U>(value: T): (op1: (t: T) => U) => U;
export function pipeline<T, A, U>(
  value: T
): (op1: (t: T) => A, op2: (a: A) => U) => U;
export function pipeline<T, A, B, U>(
  value: T
): (op1: (t: T) => A, op2: (a: A) => B, op3: (b: B) => U) => U;
export function pipeline<T, A, B, C, U>(
  value: T
): (
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => U
) => U;
export function pipeline<T, A, B, C, D, U>(
  value: T
): (
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => U
) => U;
export function pipeline<T, A, B, C, D, E, U>(
  value: T
): (
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => U
) => U;
export function pipeline<T, A, B, C, D, E, F, U>(
  value: T
): (
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => U
) => U;
export function pipeline<T, A, B, C, D, E, F, G, U>(
  value: T
): (
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => G,
  op8: (g: G) => U
) => U;
export function pipeline<T, A, B, C, D, E, F, G, H, U>(
  value: T
): (
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => G,
  op8: (g: G) => H,
  op9: (h: H) => U
) => U;
export function pipeline<T, A, B, C, D, E, F, G, H, I, U>(
  value: T
): (
  op1: (t: T) => A,
  op2: (a: A) => B,
  op3: (b: B) => C,
  op4: (c: C) => D,
  op5: (d: D) => E,
  op6: (e: E) => F,
  op7: (f: F) => G,
  op8: (g: G) => H,
  op9: (h: H) => I,
  op10: (i: I) => U
) => U;
export function pipeline<T>(input: T) {
  return (...opN: Array<(t: any) => any>) =>
    opN.length ? pipeRaw(input, ...opN) : input;
}
