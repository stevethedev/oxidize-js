import { None, Option, Some } from "./options";

/**
 * Provides a Rust-inspired error-handling structure.
 *
 * Error-handling is a common software engineering problem in any non-trivial
 * project. JavaScript's built-in error-handling involves thrown exceptions
 * and `try...catch` statements. This is a simple and (often) effective tool
 * that has one major flaw:
 *
 * ```typescript
 * const A = () => B();
 * const B = () => C();
 * const C = () => D();
 * const E = () => F();
 * const F = () => { throw new Error("Foo"); };
 * ```
 *
 * In a non-trivial system, where functions `A` and `F` may not be in the same
 * file, it is unrealistic to expect the author of function `A` to know that
 * they they will need to `catch` an error.
 *
 * `Result<T, F>` is the type used for explicitly returning and propagating
 * errors in a way that makes error-handling straightforward.
 *
 * ```typescript
 * type Version = 1 | 2;
 *
 * function parseVersion(header: Uint8Array): Result<Version, string> {
 *   switch (header[0]) {
 *     case null: return Fail("invalid header length");
 *     case 1: return Ok(1);
 *     case 2: return Ok(2);
 *     default: return Fail("invalid version");
 *   }
 * }
 *
 * const version = parseVersion(new Uint8Array([1, 2, 3, 4]));
 * version.match({
 *   Ok(v) { console.log(`Working with version: ${v}`); },
 *   Fail(f) { console.error(`Error parsing header: ${f}`); },
 * });
 * ```
 *
 * Pattern matching on `Result` is clear and straightforward for simple cases,
 * but `Result` comes with some Rust-inspired convenience methods that make
 * working with it more succinct.
 *
 * The `isOk` and `isErr` methods do what they say:
 *
 * ```typescript
 * let goodResult: Result<number, number> = Ok(10);
 * let badResult: Result<number, number> = Fail(10);
 *
 * expect(isOk(goodResult) && !isFail(goodResult)).toBe(true);
 * expect(isFail(badResult) && !isOk(badResult)).toBe(true);
 * ```
 *
 * The `map` consumes the `Result` and produces another:
 *
 * ```typescript
 * goodResult = map(goodResult, i => i + 1);
 * badResult = map(badResult, i => i - 1);
 * ```
 *
 * Use `andThen` to continue the computation:
 *
 * ```typescript
 * let convertedResult: Result<bool, number> = andThen(goodResult, i => Ok(i === 11));
 * ```
 *
 * Use `orElse` to handle the error:
 *
 * ```typescript
 * let fixedResult: Result<number, number> = orElse(badResult, i => Ok(i + 20));
 * ```
 *
 * Extract the value with `unwrap` if the value is valid:
 *
 * ```typescript
 * let finalResult: number = unwrap(fixedResult);
 * ```
 */
export type Result<T> = T | Error;

/**
 * Collects many `Result<T, F>`s into one `Result<T[], F>`.
 *
 * @param results The list of results to collect.
 *
 * ```typescript
 * expect(arrayToResult([Ok(1), Ok(2), Ok(3)])).toEqual(Ok([1, 2, 3]));
 * expect(arrayToResult([Ok(1), Ok(2), Fail(3)])).toEqual(Fail(3));
 * expect(arrayToResult([Ok(1), Fail(2), Ok(3)])).toEqual(Fail(2));
 * expect(arrayToResult([Ok(1), Fail(2), Fail(3)])).toEqual(Fail(2));
 * expect(arrayToResult([Fail(1), Ok(2), Ok(3)])).toEqual(Fail(1));
 * expect(arrayToResult([Fail(1), Ok(2), Fail(3)])).toEqual(Fail(1));
 * expect(arrayToResult([Fail(1), Fail(2), Ok(3)])).toEqual(Fail(1));
 * expect(arrayToResult([Fail(1), Fail(2), Fail(3)])).toEqual(Fail(1));
 * ```
 */
export function arrayToResult<T>(results: Array<Result<T>>): Result<T[]> {
  const collection: T[] = [];
  for (const result of results) {
    if (isFail(result)) {
      return result;
    }
    collection.push(result);
  }
  return collection;
}

/**
 * Converts a Dictionary of `Result` objects into a single Result.
 *
 * @param results A Dictionary of results to convert into a single Result.
 *
 * ```typescript
 * const results = {
 *   a: Ok(1),
 *   b: Ok(2),
 *   c: Ok(3),
 * };
 *
 * expect(objectToResult(results)).toEqual(Ok({ a: 1, b: 2, c: 3 }));
 *
 * const withFail = {
 *   a: Ok(1),
 *   b: Fail(2),
 *   c: Fail(3),
 * };
 *
 * expect(objectToResult(withFail)).toEqual(Fail(2));
 *
 * const withValues = {
 *   a: Ok(1),
 *   b: 2,
 *   c: Ok(3),
 * };
 *
 * expect(objectToResult(withValues)).toEqual(Ok({ a: 1, b: 2, c: 3 }));
 *
 * const withFailAndValues = {
 *   a: Ok(1),
 *   b: 2,
 *   c: Fail(3),
 * };
 *
 * expect(objectToResult(withFailAndValues)).toEqual(Fail(3));
 * ```
 */
export function objectToResult<
  IObject extends object,
  T = {
    [key in keyof IObject]: IObject[key] extends Result<infer A>
      ? A
      : IObject[key]
  }
>(results: IObject): Result<T> {
  const r: { [key in keyof IObject]?: T } = {};
  for (const [key, value] of Object.entries(results)) {
    if (isFail(value)) {
      return value;
    }
    r[key as keyof IObject] = value;
  }
  return Ok(r as T);
}
/**
 * Collects a Promise `resolve`/`reject` into a `Result`.
 *
 * @param op The function call to wrap.
 *
 * ```typescript
 * expect(getResultAsync(async () => 7)).toEqual(Ok(7));
 * expect(getResultAsync(async () => {
 *   throw new Error("foo");
 * })).toEqual(Fail(new Error("foo")));
 * ```
 */
export async function getResultAsync<T>(
  op: () => Promise<T>
): Promise<Result<T>> {
  try {
    return await op();
  } catch (error) {
    return error;
  }
}

/**
 * Returns `res` if this is `Ok`, otherwise returns this `Fail`.
 *
 * @param rhs The second result to return.
 *
 * ```typescript
 * const x = Ok(2);
 * const y = Fail("late error");
 *
 * expect(fail(and(x, y))).toBe("late error");
 *
 * x = Fail("early error");
 * y = Ok("foo");
 *
 * expect(fail(and(x, y))).toBe("early error");
 *
 * x = Fail("not a 2");
 * y = Fail("late error");
 *
 * expect(fail(and(x, y))).toBe("not a 2");
 *
 * x = Ok(2);
 * y = Ok("different result type");
 *
 * expect(ok(and(x, y))).toBe("different result type");
 * ```
 */
// tslint:disable
// prettier-ignore
export function and<T, U>                              (lhs: Result<T>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, U>                           (lhs: Result<T>, a: Result<A>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, U>                        (lhs: Result<T>, a: Result<A>, b: Result<B>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, C, U>                     (lhs: Result<T>, a: Result<A>, b: Result<B>, c: Result<C>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, C, D, U>                  (lhs: Result<T>, a: Result<A>, b: Result<B>, c: Result<C>, d: Result<D>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, U>               (lhs: Result<T>, a: Result<A>, b: Result<B>, c: Result<C>, d: Result<D>, e: Result<E>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, U>            (lhs: Result<T>, a: Result<A>, b: Result<B>, c: Result<C>, d: Result<D>, e: Result<E>, f: Result<F>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, G, U>         (lhs: Result<T>, a: Result<A>, b: Result<B>, c: Result<C>, d: Result<D>, e: Result<E>, f: Result<F>, g: Result<G>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, G, H, U>      (lhs: Result<T>, a: Result<A>, b: Result<B>, c: Result<C>, d: Result<D>, e: Result<E>, f: Result<F>, g: Result<G>, h: Result<H>, rhs: Result<U>): Result<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, G, H, I, U>   (lhs: Result<T>, a: Result<A>, b: Result<B>, c: Result<C>, d: Result<D>, e: Result<E>, f: Result<F>, g: Result<G>, h: Result<H>, i: Result<I>, rhs: Result<U>): Result<U>;
// tslint:enable
export function and<T, U>(lhs: Result<T>, rhs: Result<U>): Result<U> {
  if (isOk(lhs)) {
    return rhs;
  }
  return lhs;
}

/**
 * Returns `rhs` if the result is `Fail`, otherwise returns the `Ok` of this.
 *
 * @param rhs Result to return if `this` is `Fail`.
 *
 * ```typescript
 * let x = Ok(2);
 * let y = Fail("late error");
 *
 * expect(or(x, y)).toEqual(Ok(2));
 *
 * x = Fail("early error");
 * y = Ok(2);
 *
 * expect(or(x, y)).toEqual(Ok(2));
 *
 * x = Fail("not a 2");
 * y = Fail("late error");
 *
 * expect(or(x, y)).toEqual(Fail("late error"));
 *
 * x = Ok(2);
 * y = Ok(100);
 *
 * expect(or(x, y)).toEqual(Ok(2));
 * ```
 */
export function or<T>(lhs: Result<T>, ...rhs: Array<Result<T>>): Result<T> {
  return rhs.reduce((l, r) => (isOk(l) ? l : r), lhs);
}

/**
 * Unwraps a result, yielding the content of an `Ok`, or else returns `optb`.
 *
 * @param optb The default value to return if `this` is `Fail`.
 *
 * ```typescript
 * expect(unwrapOr(Ok(9), 2)).toBe(9);
 * expect(unwrapOr(Fail("error"), 2)).toBe(2);
 * ```
 */
export function unwrapOr<T>(lhs: Result<T>, def: T): T {
  return isOk(lhs) ? lhs : def;
}

/**
 * Unwraps a result, yielding the content of an `Ok`, or else executes `op`.
 *
 * @param op The function to execute to get a value.
 *
 * ```typescript
 * const count = (x: typeof Error.message) => x.length;
 *
 * expect(unwrapOrElse(Ok(2), count)).toBe(2);
 * expect(unwrapOrElse(Fail("foo"), count)).toBe(3);
 * ```
 */
export function unwrapOrElse<T>(res: Result<T>, op: () => T): T {
  if (isOk(res)) {
    return res;
  }
  return op();
}

type MatchBlockOk<T, A> = (val: T) => A;
type MatchBlockFail<B> = (err: Error) => B;
interface MatchBlock<T, A, B> {
  Ok: MatchBlockOk<T, A>;
  Fail: MatchBlockFail<B>;
}

const isMatchOk = <T, A>(fn: any): fn is MatchBlockOk<T, A> =>
  "function" === typeof fn;
const isMatchFail = <B>(fn: any): fn is MatchBlockFail<B> =>
  "function" === typeof fn;

/**
 * Provides a convenient interface for matching against `Fail` and `Ok`.
 *
 * @param result The result to match against.
 * @param matchBlock The MatchBlock to execute the `Result` against.
 *
 * ```typescript
 * const match = {
 *   Ok: (x) => x * 3,
 *   Fail: (e) => 2,
 * };
 *
 * expect(match(Fail("no match"), match)).toBe(2);
 * expect(match(Ok(7), match)).toBe(21);
 * ```
 */
export function match<T, A, B>(result: Result<T>, block: MatchBlock<T, A, B>) {
  if (isOk(result) && isMatchOk(block.Ok)) {
    return block.Ok(result);
  }
  if (isFail(result) && isMatchFail(block.Fail)) {
    return block.Fail(result);
  }
  return result;
}

/**
 * Contains a Success Value.
 *
 * @param t Success value.
 */
export function Ok<T, F = any>(t: T): Result<T> {
  return t;
}

/**
 * Contains an Error Value.
 *
 * @param f Error value.
 */
export function Fail<T>(f: string | Result<string>): Result<T> {
  if (isFail(f)) {
    return f;
  }
  return new Error(f);
}

/**
 * Collects a traditional value/throw into a `Result`.
 *
 * This function is especially useful for capturing the values and thrown
 * errors of functions that do not use the `Result` pattern.
 *
 * @param op The function call to wrap.
 *
 * ```typescript
 * expect(getResult(() => 7)).toEqual(Ok(7));
 * expect(getResult(() => {
 *   throw new Error("foo");
 * })).toEqual(Fail(new Error("foo")));
 * ```
 */
export const getResult = <T>(fn: () => T): Result<T> => {
  try {
    return fn();
  } catch (e) {
    if (isFail(e)) {
      return e;
    }
    return new Error(`${e}`);
  }
};

/**
 * Returns `true` if the result is Ok, or else `false`.
 * @param result The result to check.
 */
export function isOk<T>(result: Result<T>): result is T {
  return !(result instanceof Error);
}

/**
 * Returns `true` if the result is an Error, or else `false`.
 * @param result The result to check.
 */
export function isFail<T>(result: Result<T>): result is Error {
  return result instanceof Error;
}

/**
 * Executes `fn` if the result is Ok.
 * @param result The result to check.
 * @param fn The function to execute.
 */
export function andThen<T>(
  result: Result<T>,
  ...ops: Array<(value: T) => Result<T>>
): Result<T> {
  return ops.reduce((lhs, op) => {
    if (isOk(lhs)) {
      return op(lhs);
    }
    return lhs;
  }, result);
}

/**
 * Converts one Result into another type of Result.
 * @param result The result to check.
 * @param fn The function to execute.
 */
// tslint:disable
// prettier-ignore
export function map<T, U>                              (lhs: Result<T>, rhs: (t: T) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, U>                           (lhs: Result<T>, a: (t: T) => Result<A>, rhs: (a: A) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, U>                        (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, rhs: (b: B) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, C, U>                     (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, c: (b: B) => Result<C>, rhs: (c: C) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, C, D, U>                  (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, c: (b: B) => Result<C>, d: (c: C) => Result<D>, rhs: (d: D) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, C, D, E, U>               (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, c: (b: B) => Result<C>, d: (c: C) => Result<D>, e: (d: D) => Result<E>, rhs: (e: E) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, C, D, E, F, U>            (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, c: (b: B) => Result<C>, d: (c: C) => Result<D>, e: (d: D) => Result<E>, f: (e: E) => Result<F>, rhs: (f: F) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, C, D, E, F, G, U>         (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, c: (b: B) => Result<C>, d: (c: C) => Result<D>, e: (d: D) => Result<E>, f: (e: E) => Result<F>, g: (f: F) => Result<G>, rhs: (g: G) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, C, D, E, F, G, H, U>      (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, c: (b: B) => Result<C>, d: (c: C) => Result<D>, e: (d: D) => Result<E>, f: (e: E) => Result<F>, g: (f: F) => Result<G>, h: (g: G) => Result<H>, rhs: (h: H) => Result<U>): Result<U>;
// prettier-ignore
export function map<T, A, B, C, D, E, F, G, H, I, U>   (lhs: Result<T>, a: (t: T) => Result<A>, b: (a: A) => Result<B>, c: (b: B) => Result<C>, d: (c: C) => Result<D>, e: (d: D) => Result<E>, f: (e: E) => Result<F>, g: (f: F) => Result<G>, h: (g: G) => Result<H>, i: (h: H) => Result<I>, rhs: (i: I) => Result<U>): Result<U>;
// tslint:enable
export function map(
  result: Result<any>,
  ...ops: Array<(x: any) => Result<any>>
): Result<any> {
  return ops.reduce((lhs, op) => {
    if (isOk(lhs)) {
      return op(lhs);
    }
    return lhs;
  }, result);
}

/**
 * Unwraps a result, yielding the content of an `Ok`.
 *
 * ```typescript
 * expect(unwrap(Ok(2))).toEqual(Ok(2));
 * expect(() => unwrap(Fail("emergency failure"))).toThrow();
 * ```
 */
export function unwrap<T>(result: Result<T>): T {
  if (!isOk(result)) {
    throw result;
  }
  throw result;
}

/**
 * Calls `op` if `this` is `Fail`, otherwise returns `this`.
 *
 * @param op The function to return a `Result`.
 *
 * ```typescript
 * const sq = (x: number): Result<number> => Ok(x * x);
 * const err = (): Result<number> => Fail("Failed");
 *
 * expect(orElse(Ok(2), sq, sq)).toEqual(Ok(2));
 * expect(orElse(Ok(2), err, sq)).toEqual(Ok(2));
 * expect(orElse(Fail("Failed"), sq, err)).toEqual(Fail("Failed"));
 * expect(orElse(Fail("Failed"), err, err)).toEqual(Fail("Failed"));
 * ```
 */
export function orElse<T>(
  result: Result<T>,
  ...op: Array<() => Result<T>>
): Result<T> {
  let r = result;
  for (let i = 0; i < op.length && !isOk(r); ++i) {
    r = op[i]();
  }
  return r;
}

/**
 * Converts from `Result<T>` to `Option<T>`, and discards any failures.
 *
 * ```typescript
 * const x = Ok(2);
 * expect(okOption(x)).toBe(2);
 *
 * const y = Fail("Nothing here");
 * expect(okOption(y)).toBe(null);
 * ```
 */
export function okOption<T>(result: Result<T>): Option<T> {
  if (isOk(result)) {
    return Some(result);
  }

  return None();
}

/**
 * Converts from `Result<T, F>` to `F | null`, and discards `T`.
 *
 * ```typescript
 * const x = Ok(2);
 * expect(failOption(x)).toBe(null);
 *
 * const y = Err("Nothing here");
 * expect(failOption(y)).toBe("Nothing here");
 * ```
 */
export function failOption<T>(result: Result<T>): Option<Error> {
  if (isFail(result)) {
    return result;
  }
  return None();
}

/**
 * Maps a `Result<T, F>` to `Result<T, G>` by applying a function contained
 * `Fail` value, leaving an `Ok` value untouched.
 *
 * @param op Transforms an `F` value to a `G` value.
 *
 * ```typescript
 * expect(mapFail(Fail("Hello"), f => `${f}, world`)).toBe(Fail("Hello, world"));
 * expect(mapFail(Ok(2), f => `${f}`)).toBe(null);
 * ```
 */
export function mapFail<T>(
  result: Result<T>,
  op: (fail: string) => string
): Result<T> {
  if (!isOk(result)) {
    return Fail(op(result.message));
  }
  return Ok(result);
}
