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
 * expect(goodResult.isOk() && !goodResult.isFail()).toBe(true);
 * expect(badResult.isFail() && !badResult.isOk()).toBe(true);
 * ```
 *
 * The `map` consumes the `Result` and produces another:
 *
 * ```typescript
 * goodResult = goodResult.map(i => i + 1);
 * badResult = badResult.map(i => i - 1);
 * ```
 *
 * Use `andThen` to continue the computation:
 *
 * ```typescript
 * let convertedResult: Result<bool, number> = goodResult.andThen(i => Ok(i === 11));
 * ```
 *
 * Use `orElse` to handle the error:
 *
 * ```typescript
 * let fixedResult: Result<number, number> = badResult.orElse(i => Ok(i + 20));
 * ```
 *
 * Extract the value with `unwrap` if the value is valid:
 *
 * ```typescript
 * let finalResult: number = fixedResult.unwrap();
 * ```
 */
export class Result<T, F = Error> {
  /**
   * Collects many `Result<T, F>`s into one `Result<T[], F>`.
   *
   * @param results The list of results to collect.
   *
   * ```typescript
   * expect(Result.fromArray([Ok(1), Ok(2), Ok(3)])).toEqual(Ok([1, 2, 3]));
   * expect(Result.fromArray([Ok(1), Ok(2), Fail(3)])).toEqual(Fail(3));
   * expect(Result.fromArray([Ok(1), Fail(2), Ok(3)])).toEqual(Fail(2));
   * expect(Result.fromArray([Ok(1), Fail(2), Fail(3)])).toEqual(Fail(2));
   * expect(Result.fromArray([Fail(1), Ok(2), Ok(3)])).toEqual(Fail(1));
   * expect(Result.fromArray([Fail(1), Ok(2), Fail(3)])).toEqual(Fail(1));
   * expect(Result.fromArray([Fail(1), Fail(2), Ok(3)])).toEqual(Fail(1));
   * expect(Result.fromArray([Fail(1), Fail(2), Fail(3)])).toEqual(Fail(1));
   * ```
   */
  public static fromArray<T, F = Error>(
    results: Array<Result<T, F>>
  ): Result<T[], F> {
    const collection: T[] = [];
    for (const result of results) {
      if (result.isFail()) {
        return (result as unknown) as Result<T[], F>;
      }
      collection.push(result.unwrap());
    }
    return Ok(collection);
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
   * expect(Result.fromObject(results)).toEqual(Ok({ a: 1, b: 2, c: 3 }));
   *
   * const withFail = {
   *   a: Ok(1),
   *   b: Fail(2),
   *   c: Fail(3),
   * };
   *
   * expect(Result.fromObject(withFail)).toEqual(Fail(2));
   *
   * const withValues = {
   *   a: Ok(1),
   *   b: 2,
   *   c: Ok(3),
   * };
   *
   * expect(Result.fromObject(withValues)).toEqual(Ok({ a: 1, b: 2, c: 3 }));
   *
   * const withFailAndValues = {
   *   a: Ok(1),
   *   b: 2,
   *   c: Fail(3),
   * };
   *
   * expect(Result.fromObject(withFailAndValues)).toEqual(Fail(3));
   * ```
   */
  public static fromObject<
    IObject extends object,
    F = Error,
    T = {
      [key in keyof IObject]: IObject[key] extends Result<infer A, any>
        ? A
        : IObject[key]
    }
  >(results: IObject): Result<T, F> {
    const r: { [key in keyof IObject]?: T } = {};
    for (const [key, value] of Object.entries(results)) {
      if (value instanceof Result) {
        if (value.isFail()) {
          return value;
        }
        r[key as keyof IObject] = value.unwrap();
      } else {
        r[key as keyof IObject] = value;
      }
    }
    return Ok(r as T);
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
   * expect(Result.wrap(() => 7)).toEqual(Ok(7));
   * expect(Result.wrap(() => {
   *   throw new Error("foo");
   * })).toEqual(Fail(new Error("foo")));
   * ```
   */
  public static wrap<T, F = Error>(op: () => T): Result<T, F> {
    try {
      return Ok(op());
    } catch (error) {
      return Fail(error);
    }
  }

  /**
   * Collects a Promise `resolve`/`reject` into a `Result`.
   *
   * @param op The function call to wrap.
   *
   * ```typescript
   * expect(Result.wrap(async () => 7)).toEqual(Ok(7));
   * expect(Result.wrap(async () => {
   *   throw new Error("foo");
   * })).toEqual(Fail(new Error("foo")));
   * ```
   */
  public static async wrapAsync<T, F = Error>(
    op: () => Promise<T>
  ): Promise<Result<T, F>> {
    try {
      return Ok(await op());
    } catch (error) {
      return Fail(error);
    }
  }

  constructor(
    private readonly _value: Readonly<T | F>,
    private readonly _isOk: Readonly<boolean>
  ) {}

  /**
   * Returns `true` if the result is `Ok`.
   *
   * ```typescript
   * const x: Result<number, string> = Ok(-3);
   * expect(x.isOk()).toBe(true);
   *
   * const y: Result<number, string> = Fail("Some error message");
   * expect(y.isOk()).toBe(false);
   * ```
   */
  public isOk(): boolean {
    return this._isOk;
  }

  /**
   * Returns `true` if the result is `Fail`.
   *
   * ```typescript
   * const x: Result<number, string> = Ok(-3);
   * expect(x.isFail()).toBe(false);
   *
   * const y: Result<number, string> = Fail("Some error message");
   * expect(y.isFail()).toBe(true);
   * ```
   */
  public isFail(): boolean {
    return !this._isOk;
  }

  /**
   * Converts from `Result<T, F>` to `T | null`, and discards `F`.
   *
   * ```typescript
   * const x = Ok(2);
   * expect(x.ok()).toBe(2);
   *
   * const y = Fail("Nothing here");
   * expect(y.ok()).toBe(null);
   * ```
   */
  public ok(): T | null {
    if (this._isOk) {
      return this._value as T;
    }

    return null;
  }

  /**
   * Converts from `Result<T, F>` to `F | null`, and discards `T`.
   *
   * ```typescript
   * const x = Ok(2);
   * expect(x.fail()).toBe(null);
   *
   * const y = Err("Nothing here");
   * expect(y.fail()).toBe("Nothing here");
   * ```
   */
  public fail(): F | null {
    if (!this._isOk) {
      return this._value as F;
    }

    return null;
  }

  /**
   * Maps a `Result<T, F>` to `Result<U, F>` by applying a function to a
   * contained `Ok` value, leaving a `Fail` untouched.
   *
   * @param op Transforms a `T` value to a `U` value.
   *
   * ```typescript
   * expect(Ok(2).map(v => `${v}`).ok()).toBe("2");
   * expect(Fail(2).map(v => `${v}`).ok()).toBe(null);
   * ```
   */
  public map<U>(op: (value: T) => U): Result<U, F> {
    if (this._isOk) {
      return Ok(op(this._value as T));
    }
    return (this as unknown) as Result<U, F>;
  }

  /**
   * Maps a `Result<T, F>` to `Result<T, G>` by applying a function contained
   * `Fail` value, leaving an `Ok` value untouched.
   *
   * @param op Transforms an `F` value to a `G` value.
   *
   * ```typescript
   * expect(Fail(2).mapFail(f => `${f}`).fail()).toBe("2");
   * expect(Ok(2).mapFail(f => `${f}`).fail()).toBe(null);
   * ```
   */
  public mapFail<E>(op: (failure: F) => E): Result<T, E> {
    if (!this._isOk) {
      return Fail(op(this._value as F));
    }
    return (this as unknown) as Result<T, E>;
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
   * expect(x.and(y).fail()).toBe("late error");
   *
   * x = Fail("early error");
   * y = Ok("foo");
   *
   * expect(x.and(y).fail()).toBe("early error");
   *
   * x = Fail("not a 2");
   * y = Fail("late error");
   *
   * expect(x.and(y).fail()).toBe("not a 2");
   *
   * x = Ok(2);
   * y = Ok("different result type");
   *
   * expect(x.and(y).ok()).toBe("different result type");
   * ```
   */
  public and<U>(rhs: Result<U, F>): Result<U, F> {
    if (this._isOk) {
      return rhs;
    }
    return (this as unknown) as Result<U, F>;
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
   * expect(x.or(y)).toEqual(Ok(2));
   *
   * x = Fail("early error");
   * y = Ok(2);
   *
   * expect(x.or(y)).toEqual(Ok(2));
   *
   * x = Fail("not a 2");
   * y = Fail("late error");
   *
   * expect(x.or(y)).toEqual(Fail("late error"));
   *
   * x = Ok(2);
   * y = Ok(100);
   *
   * expect(x.or(y)).toEqual(Ok(2));
   * ```
   */
  public or<A>(rhs: A): Result<T, F> | A {
    if (this._isOk) {
      return this;
    }
    return rhs;
  }

  /**
   * Calls `op` if the result is `Ok`. Otherwise, returns `this` as `Fail`.
   *
   * @param op The function to return a `Result`.
   *
   * ```typescript
   * const sq = (x: number): Result<number, number> => Ok(x * x);
   * const err = (x: number): Result<number, number> => Fail(x);
   *
   * expect(Ok(2).andThen(sq).andThen(sq)).toEqual(Ok(16));
   * expect(Ok(2).andThen(sq).andThen(err)).toEqual(Fail(4));
   * expect(Ok(2).andThen(err).andThen(sq)).toEqual(Fail(2));
   * expect(Fail(3).andThen(sq).andThen(sq)).toEqual(Fail(3));
   * ```
   */
  public andThen<U>(op: (value: T) => Result<U, F>): Result<U, F> {
    if (this._isOk) {
      return op(this._value as T);
    }
    return (this as unknown) as Result<U, F>;
  }

  /**
   * Calls `op` if `this` is `Fail`, otherwise returns `this`.
   *
   * @param op The function to return a `Result`.
   *
   * ```typescript
   * const sq = (x: number): Result<number, number> => Ok(x * x);
   * const err = (x: number): Result<number, number> => Fail(x);
   *
   * expect(Ok(2).orElse(sq).orElse(sq)).toEqual(Ok(2));
   * expect(Ok(2).orElse(err).orElse(sq)).toEqual(Ok(2));
   * expect(Fail(3).orElse(sq).orElse(err)).toEqual(Ok(9));
   * expect(Fail(3).orElse(err).orElse(err)).toEqual(Fail(3));
   * ```
   */
  public orElse<A>(op: (failure: F) => Result<T, F>): Result<T, F> {
    if (!this._isOk) {
      return op(this._value as F);
    }
    return this;
  }

  /**
   * Unwraps a result, yielding the content of an `Ok`.
   *
   * ```typescript
   * expect(Ok(2).unwrap()).toEqual(Ok(2));
   * expect(() => Fail("emergency failure").unwrap()).toThrow();
   * ```
   */
  public unwrap(): T {
    if (!this._isOk) {
      throw this._value;
    }
    return this._value as T;
  }

  /**
   * Unwraps a result, yielding the content of an `Ok`, or else returns `optb`.
   *
   * @param optb The default value to return if `this` is `Fail`.
   *
   * ```typescript
   * expect(Ok(9).unwrapOr(2)).toBe(9);
   * expect(Fail("error").unwrapOr(2)).toBe(2);
   * ```
   */
  public unwrapOr(optb: T): T {
    if (this._isOk) {
      return this._value as T;
    }
    return optb;
  }

  /**
   * Unwraps a result, yielding the content of an `Ok`, or else executes `op`.
   *
   * @param op The function to execute to get a value.
   *
   * ```typescript
   * const count = (x: string) => x.length;
   *
   * expect(Ok(2).unwrapOrElse(count)).toBe(2);
   * expect(Fail("foo").unwrapOrElse(count)).toBe(3);
   * ```
   */
  public unwrapOrElse(op: (f: F) => T): T {
    if (this._isOk) {
      return this._value as T;
    }

    return op(this._value as F);
  }

  /**
   * Provides a convenient interface for matching against `Fail` and `Ok`.
   *
   * @param matchBlock The MatchBlock to execute the `Result` against.
   *
   * ```typescript
   * const match = {
   *   Ok: (x) => x * 3,
   *   Fail: (y) => y * 2,
   * };
   *
   * expect(Fail(7).match(match)).toBe(14);
   * expect(Ok(7).match(match)).toBe(21);
   * ```
   */
  public match<A, B>(matchBlock: MatchBlock<T, F, A, B>): A | B {
    if (this._isOk) {
      return matchBlock.Ok(this._value as T);
    }
    return matchBlock.Fail(this._value as F);
  }
}

interface MatchBlock<T, F, A, B> {
  Ok: ((val: T) => A) | (() => A);
  Fail: ((err: F) => B) | (() => B);
}

/**
 * Contains a Success Value.
 *
 * @param t Success value.
 */
export function Ok<T, F = any>(t: T): Result<T, F> {
  return new Result<T, F>(t, true);
}

/**
 * Contains an Error Value.
 *
 * @param f Error value.
 */
export function Fail<F, T = any>(f: F): Result<T, F> {
  return new Result<T, F>(f, false);
}
