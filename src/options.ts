import { Fail, Ok, Result } from "./result";

const INTERNAL = Symbol("options");
const EMPTY_VALUE = Symbol("EMPTY_VALUE");
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
/**
   * Creates an `Option` containing a value (`Some`).
   *
   * @param value The value to wrap in the `Option`.
   * @returns An `Option` representing a present value.
   */
  static Some<T>(value: T) {
    return new Option(INTERNAL, value);
  }

  /**
   * Creates an `Option` representing no value (`None`).
   *
   * @returns An `Option` representing a missing value.
   */
  static None<T>() {
    return new Option<T>(INTERNAL, EMPTY_VALUE);
  }

  /**
   * Returns `Some<T>` if the value is not null or undefined, else `None<T>`.
   *
   * @param value The value to convert into an `Option<T>`.
   *
   * This function will also check if a value is already an `Option` and, if
   * so, then it will return that `Option` instead. This approach could be
   * overkill in trivial cases; but it does simplify the process of interacting
   * with other `Option` values.
   *
   * ```typescript
   * function double(number?: number | Option<number>): number {
   *   const maybeNumber = Option.from(number);
   *   return maybeNumber.unwrapOr(0) * 2;
   * }
   *
   * expect(double()).toBe(0);
   * expect(double(1)).toBe(2);
   * expect(double(None())).toBe(0);
   * expect(double(Some(2))).toBe(4);
   * ```
   */
  static from<T>(value: T | undefined | null | Option<T>): Option<T> {
    if (value instanceof Option) {
      return value;
    }
    if (value !== void 0 && value !== null) {
      return Option.Some<T>(value);
    }
    return Option.None<T>();
  }

  readonly #value: T | typeof EMPTY_VALUE;
  private constructor(internal: symbol, value: T | typeof EMPTY_VALUE) {
    if (internal !== INTERNAL) {
      throw new Error("Option cannot be constructed directly. Use Option.Some() or Option.None() instead.");
    }
    this.#value = value;
  }

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
  isSome(): boolean {
    return this.#value !== EMPTY_VALUE;
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
  isNone(): boolean {
    return this.#value === EMPTY_VALUE;
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
  match<A, B>(matchBlock: OptionMatchBlock<T, A, B>): A | B {
    if (this.isSome()) {
      return matchBlock.Some(this.#value as T);
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
  unwrap(msg: string = "Attempted to unwrap a `None` Option"): T {
    if (this.isSome()) {
      return this.#value as T;
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
  unwrapOr(def: T): T {
    if (this.isSome()) {
      return this.#value as T;
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
  unwrapOrElse(fn: () => T): T {
    if (this.isSome()) {
      return this.#value as T;
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
  map<U>(fn: (val: T) => U): Option<U> {
    if (this.isNone()) {
      return Option.None();
    }
    return Option.Some(fn(this.#value as T));
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
  mapOr<U>(def: U, fn: (val: T) => U): U {
    if (this.isSome()) {
      return fn(this.#value as T);
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
  mapOrElse<U>(def: () => U, fn: (val: T) => U): U {
    if (this.isSome()) {
      return fn(this.#value as T);
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
  okOr<F>(fail: F): Result<T, F> {
    if (this.isSome()) {
      return Ok<T, F>(this.#value as T);
    }
    return Fail<T, F>(fail);
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
  okOrElse<F>(fn: () => F): Result<T, F> {
    if (this.isSome()) {
      return Ok<T, F>(this.#value as T);
    }
    return Fail<T, F>(fn());
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
  and<U>(rhs: Option<U>): Option<U> {
    if (this.isSome()) {
      return rhs;
    }
    return Option.None();
  }

  /**
   * Returns `None` if the option is `None`, or else calls `fn()`.
   *
   * @param fn The function to retrieve the next value from.
   *
   * ```typescript
   * const sq = (x: number): Option<number> => Some(x * x);
   * const nope = (_: number): Option<number> => None();
   *
   * expect(Some(2).andThen(sq).andThen(sq)).toEqual(Some(16));
   * expect(Some(2).andThen(sq).andThen(nope)).toEqual(None());
   * expect(Some(2).andThen(nope).andThen(sq)).toEqual(None());
   * expect(None().andThen(sq).andThen(sq)).toEqual(None());
   * ```
   */
  andThen<U>(fn: (val: T) => Option<U>): Option<U> {
    if (this.isSome()) {
      return fn(this.#value as T);
    }
    return Option.None();
  }

  /**
   * Applies a filter to the `Option` that could convert it to a `None`.
   *
   * @param fn The filtering function to use.
   *
   * If this `Option` is a `Some` value, then `fn` is called with the wrapped
   * value as the parameter. If the function returns `true`, then the current
   * Option is returned. If the function returns a non-`true` value, then a
   * `None` value is returned instead.
   *
   * ```typescript
   * const isEven = (n: number) => (n % 2 === 0);
   *
   * expect(None(0).filter(isEven)).toEqual(None(0));
   * expect(Some(3).filter(isEven)).toEqual(None(0));
   * expect(Some(4).filter(isEven)).toEqual(Some(4));
   * ```
   */
  filter(fn: (val: T) => boolean): Option<T> {
    if (this.isSome() && fn(this.#value as T)) {
      return this;
    }
    return Option.None();
  }

  /**
   * Returns the `Option` if it contains a value, or else returns `rhs`.
   *
   * @param rhs The second `Option` to return if this is `None()`.
   *
   * ```typescript
   * let x = Some(2);
   * let y = None();
   *
   * expect(x.or(y)).toEqual(Some(2));
   *
   * x = None();
   * y = Some(100);
   *
   * expect(x.or(y)).toEqual(Some(100));
   *
   * x = Some(2);
   * y = Some(100);
   *
   * expect(x.or(y)).toEqual(Some(2));
   *
   * x = None();
   * y = None();
   * expect(x.or(y)).toEqual(None(0));
   * ```
   */
  or(rhs: Option<T>): Option<T> {
    if (this.isSome()) {
      return this;
    }
    return rhs;
  }

  /**
   * Returns the `Option` if it contains a value, otherwise `fn()`.
   *
   * @param fn The function to lazily execute if this is `None`.
   *
   * ```typescript
   * const nobody = () => None("");
   * const vikings = () => Some("vikings");
   *
   * expect(Some("barbarians").orElse(vikings)).toEqual(Some("barbarians"));
   * expect(None("").orElse(vikings)).toEqual(Some("vikings"));
   * expect(None("").orElse(nobody)).toEqual(None(""));
   * ```
   */
  orElse(fn: () => Option<T>): Option<T> {
    if (this.isSome()) {
      return this;
    }
    return fn();
  }
}

/**
 * A match block for `Option<T>`.
 */
export interface OptionMatchBlock<T, A, B> {
    /**
     * The function to execute if this is a `Some` value.
     */
  Some: ((val: T) => A) | (() => A);

    /**
     * The function to execute if this is a `None` value.
     */
  None: () => B;
}

/**
 * Represents a present optional value.
 *
 * @param value The value to wrap.
 */
export function Some<T>(value: T) {
  return Option.Some(value);
}

/**
 * Represents a missing optional value.
 *
 * This convenience method uses a type-hinting parameter to get better
 * implicit types for TypeScript. In JavaScript there is no reason to
 * use the `_hint` parameter; it is no-op.
 */
export function None<T>(): Option<T> {
  return Option.None();
}
