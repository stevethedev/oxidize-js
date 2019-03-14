import { Fail, Ok, Result } from "./result";

/**
 * Optional values.
 *
 * Type `Option` represents an optional value, where every `Option` is either
 * `Some` and contains a value, or `None` and does not. In TypeScript, this is
 * usually represented as either `T | null` or `val?: T`; and in most cases,
 * this is sufficient. However, sometimes it is syntactically unclear whether
 * an `undefined` or `null` value represents a deliberate "missing" value or
 * is caused by an upstream logic error. The `Option` class fills this void
 * by making these choices explicit and enforcing them at runtime.
 *
 * ```typescript
 * function divide(numerator: number, denominator: number): Option<number> {
 *   if (denominator === 0) {
 *     return None();
 *   } else {
 *     return Some(numerator / denominator);
 *   }
 * }
 *
 * // The return value of the function is an `Option`
 * const result = divide(2, 3);
 *
 * result.match({
 *   Some: x => console.log(`Result: ${x}`),
 *   None: () => console.log("Cannot divide by 0"),
 * });
 * ```
 */
export class Option<T> {
  constructor(private value?: T) {}

  /**
   * Returns `true` if the option is a `Some` value.
   *
   * ```typescript
   * const x = Some(2);
   * expect(x.isSome()).toBe(true);
   *
   * const y = None();
   * expect(y.isSome()).toBe(false);
   * ```
   */
  public isSome(): boolean {
    return this.value !== void 0;
  }

  /**
   * Returns `true` if the option is `None`.
   *
   * ```typescript
   * const x = Some(2);
   * expect(x.isNone()).toBe(false);
   *
   * const y = None();
   * expect(y.isNone()).toBe(true);
   * ```
   */
  public isNone(): boolean {
    return this.value === void 0;
  }

  /**
   * Provides a convenient interface for matching against `Fail` and `Ok`.
   *
   * @param matchBlock The MatchBlock to execute the `Result` against.
   *
   * ```typescript
   * const match = {
   *   Some: (x) => x * 3,
   *   None: () => 0,
   * };
   *
   * expect(Some(7).match(match)).toBe(21);
   * expect(None().match(match)).toBe(0);
   * ```
   */
  public match<A, B>(matchBlock: MatchBlock<T, A, B>): A | B {
    if (this.isSome()) {
      return matchBlock.Some(this.value as T);
    }
    return matchBlock.None();
  }

  /**
   * Unwraps an option, yielding the content of a `Some`, or throws.
   *
   * @param msg The message to place in the thrown error.
   *
   * This method is discouraged for use within a system using Oxidize, but
   * can be useful for translating the boundaries of a system into vanilla
   * JavaScript that can be consumed by non-Oxidize applications.
   *
   * ```typescript
   * const x = Some("value");
   * expect(x.unwrap("the world is ending")).toBe("value");
   *
   * const y = None();
   * expect(() => y.unwrap()).toThrow();
   * ```
   */
  public unwrap(msg: string = "Attempted to unwrap a `None` Option"): T {
    if (this.isSome()) {
      return this.value as T;
    }
    throw new Error(msg);
  }

  /**
   * Unwraps an option, yielding the content of a `Some`, or returns `def`.
   *
   * @param def The default value to return if unwraping fails.
   *
   * ```typescript
   * expect(Some("car").unwrapOr("bike")).toBe("car");
   * expect(None().unwrapOr("bike")).toBe("bike");
   * ```
   */
  public unwrapOr(def: T): T {
    if (this.isSome()) {
      return this.value as T;
    }
    return def;
  }

  /**
   * Unwraps an option, yielding the content of a `Some`, or executes `fn()`.
   *
   * @param fn The function to execute if this is `None`.
   *
   * The value of `fn()` is lazily-executed, so if `this` is `Some`, then
   * the function is never executed.
   *
   * ```typescript
   * expect(Some("car").unwrapOrElse(() => "bike")).toBe("car");
   * expect(None().unwrapOrElse(() => "bike")).toBe("bike");
   * ```
   */
  public unwrapOrElse(fn: () => T): T {
    if (this.isSome()) {
      return this.value as T;
    }
    return fn();
  }

  /**
   * Maps an `Option<T>` to an `Option<u>` by applying a transformation.
   *
   * @param fn The function to apply the transformation against.
   *
   * If `this` is a `None` value, then this function has no effect and
   * short-circuits to return `None`.
   *
   * ```typescript
   * const maybeString = Some("Hello, world");
   * const maybeLen = maybeString.map(s => s.length);
   * expect(maybeLen).toEqual(Some(12));
   *
   * const possibleString = None();
   * const possibleLength = possibleString.map(s => s.length);
   * expect(possibleLength).toEqual(None());
   * ```
   */
  public map<U>(fn: (val: T) => U): Option<U> {
    if (this.isNone()) {
      return None();
    }
    return Some(fn(this.value as T));
  }

  /**
   * Applies a function to the contained value, or returns the default.
   *
   * @param def The default value to use if this is `None`.
   * @param fn The function to run against the `Some` value.
   *
   * ```typescript
   * expect(Some("foo").mapOr(42, x => x.length)).toBe(3);
   * expect(None().mapOr(42, x => x.length)).toBe(42);
   * ```
   */
  public mapOr<U>(def: U, fn: (val: T) => U): U {
    if (this.isSome()) {
      return fn(this.value as T);
    }
    return def;
  }

  /**
   * Applies a function to the contained value, or else computes a default.
   *
   * @param def The function to lazily evaluate if this is `None`.
   * @param fn The function to lazily evaluate if this is `Some`.
   *
   * ```typescript
   * const k = 21;
   *
   * let x = Some("foo");
   * expect(x.mapOrElse(() => 2 * k, v => v.length)).toBe(3);
   *
   * x = None();
   * expect(x.mapOrElse(() => 2 * k, v => v.length)).toBe(42);
   * ```
   */
  public mapOrElse<U>(def: () => U, fn: (val: T) => U): U {
    if (this.isSome()) {
      return fn(this.value as T);
    }
    return def();
  }

  /**
   * Transforms the `Option<T>` into a `Result<T, F>`.
   *
   * @param fail The failure to create if this is `None`.
   *
   * This maps `Some(v)` to `Ok(v)` and `None` to `Fail(fail)`.
   *
   * ```typescript
   * let x = Some("foo");
   * expect(x.okOr(0)).toEqual(Some("foo"));
   *
   * x = None();
   * expect(x.okOr(0)).toEqual(Fail(0));
   * ```
   */
  public okOr<F>(fail: F): Result<T, F> {
    if (this.isSome()) {
      return Ok(this.value as T);
    }
    return Fail(fail);
  }

  /**
   * Transforms the `Option<T>` into a `Result<T, F>`.
   *
   * @param fn The transformation function.
   *
   * This maps `Some(v)` to `Ok(v)` and `None` to `Fail(fn())`.
   *
   * ```typescript
   * let x = Some("foo");
   * expect(x.okOrElse(() => 0)).toEqual(Ok("foo"));
   *
   * x = None();
   * expect(x.okOrElse(() => 0)).toEqual(Fail(0));
   * ```
   */
  public okOrElse<F>(fn: () => F): Result<T, F> {
    if (this.isSome()) {
      return Ok(this.value as T);
    }
    return Fail(fn());
  }

  /**
   * Returns `None` if the option is `None`, otherwise returns `rhs`.
   *
   * @param rhs The right-hand-side to use.
   *
   * ```typescript
   * let x = Some(2);
   * let y = None();
   *
   * expect(x.and(y)).toEqual(None());
   *
   * x = None();
   * y = Some("foo");
   *
   * expect(x.and(y)).toEqual(None());
   *
   * x = Some(2);
   * y = Some("foo");
   *
   * expect(x.and(y)).toEqual(Some("foo"));
   *
   * x = None();
   * y = None();
   *
   * expect(x.and(y)).toEqual(None());
   * ```
   */
  public and<U>(rhs: Option<U>): Option<U> {
    if (this.isSome()) {
      return rhs;
    }
    return None();
  }
}

interface MatchBlock<T, A, B> {
  Some: ((val: T) => A) | (() => A);
  None: (() => B) | (() => B);
}

export function Some<T>(value: T) {
  return new Option(value);
}

export function None<T>() {
  return new Option<T>();
}
