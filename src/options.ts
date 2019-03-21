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
export type Option<T> = T | void | undefined;

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
 *   return unwrapOr(toValue(maybeNumber), 0) * 2;
 * }
 *
 * expect(double()).toBe(0);
 * expect(double(1)).toBe(2);
 * expect(double(None())).toBe(0);
 * expect(double(Some(2))).toBe(4);
 * ```
 */
export function toOption<T>(opt: T | Option<T>): Option<T> {
  if (isSome(opt)) {
    return opt;
  }
  return None<T>();
}

/**
 * Returns `true` if the option is a `Some` value.
 *
 * ```typescript
 * const x = Some(2);
 * expect(isSome(x)).toBe(true);
 *
 * const y = None();
 * expect(isSome(y)).toBe(false);
 * ```
 */
export function isSome<T>(opt: Option<T>): opt is T {
  return opt !== void 0 && opt !== null;
}

/**
 * Returns `true` if the option is `None`.
 *
 * ```typescript
 * const x = Some(2);
 * expect(isNone(x)).toBe(false);
 *
 * const y = None();
 * expect(isNone(y)).toBe(true);
 * ```
 */
export function isNone<T>(opt: Option<T>): opt is void {
  return opt === void 0 || opt === null;
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
 * expect(match(Some(7), match)).toBe(21);
 * expect(match(None(), match)).toBe(0);
 * ```
 */
export function match<T, A, B>(
  opt: Option<T>,
  matchBlock: MatchBlock<T, A, B>
): A | B {
  if (isSome(opt)) {
    return matchBlock.Some(opt);
  }
  return matchBlock.None();
}
interface MatchBlock<T, A, B> {
  Some: (val: T) => A;
  None: () => B;
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
 * expect(unwrap(x, "the world is ending")).toBe("value");
 *
 * const y = None();
 * expect(() => unwrap(y)).toThrow();
 * ```
 */
export function unwrap<T>(
  opt: Option<T>,
  msg: string = "Attempted to unwrap a `None` Option"
): T {
  if (isSome(opt)) {
    return opt;
  }
  throw new Error(msg);
}

/**
 * Unwraps an option, yielding the content of a `Some`, or returns `def`.
 *
 * @param def The default value to return if unwraping fails.
 *
 * ```typescript
 * expect(unwrapOr(Some("car"), "bike")).toBe("car");
 * expect(unwrapOr(None(), "bike")).toBe("bike");
 * ```
 */
export function unwrapOr<T>(opt: Option<T>, def: T): T {
  if (isSome(opt)) {
    return opt;
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
 * expect(unwrapOrElse(Some("car"), () => "bike")).toBe("car");
 * expect(unwrapOrElse(None(), () => "bike")).toBe("bike");
 * ```
 */
export function unwrapOrElse<T>(opt: Option<T>, fn: () => T): T {
  if (isSome(opt)) {
    return opt;
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
 * const maybeLen = map(maybeString, s => s.length);
 * expect(maybeLen).toEqual(Some(12));
 *
 * const possibleString = None();
 * const possibleLength = map(possibleString, s => s.length);
 * expect(possibleLength).toEqual(None());
 * ```
 */
export function map<T, U>(opt: Option<T>, fn: (val: T) => U): Option<U> {
  if (isNone(opt)) {
    return None();
  }
  return Some(fn(opt));
}

/**
 * Applies a function to the contained value, or returns the default.
 *
 * @param def The default value to use if this is `None`.
 * @param fn The function to run against the `Some` value.
 *
 * ```typescript
 * expect(mapOr(Some("foo"), 42, x => x.length)).toBe(3);
 * expect(mapOr(None(), 42, x => x.length)).toBe(42);
 * ```
 */
export function mapOr<T, U>(opt: Option<T>, def: U, fn: (val: T) => U): U {
  if (isSome(opt)) {
    return fn(opt);
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
 * expect(mapOrElse(x, () => 2 * k, v => v.length)).toBe(3);
 *
 * x = None();
 * expect(mapOrElse(x, () => 2 * k, v => v.length)).toBe(42);
 * ```
 */
export function mapOrElse<T, U>(
  opt: Option<T>,
  def: () => U,
  fn: (val: T) => U
): U {
  if (isSome(opt)) {
    return fn(opt);
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
 * expect(okOr(x, 0)).toEqual(Some("foo"));
 *
 * x = None();
 * expect(okOr(x, 0)).toEqual(Fail(0));
 * ```
 */
export function okOr<T>(opt: Option<T>, fail: string | Error): Result<T> {
  if (isSome(opt)) {
    return Ok(opt);
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
 * expect(okOrElse(x, () => 0)).toEqual(Ok("foo"));
 *
 * x = None();
 * expect(okOrElse(x, () => 0)).toEqual(Fail(0));
 * ```
 */
export function okOrElse<T>(opt: Option<T>, fn: () => Result<T>): Result<T> {
  if (isSome(opt)) {
    return Ok(opt);
  }
  return fn();
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
 * expect(and(x, y)).toEqual(None());
 *
 * x = None();
 * y = Some("foo");
 *
 * expect(and(x, y)).toEqual(None());
 *
 * x = Some(2);
 * y = Some("foo");
 *
 * expect(and(x, y)).toEqual(Some("foo"));
 *
 * x = None();
 * y = None();
 *
 * expect(and(x, y)).toEqual(None());
 * ```
 */
// tslint:disable
// prettier-ignore
export function and<T, U>                              (lhs: Option<T>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, U>                           (lhs: Option<T>, a: Option<A>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, U>                        (lhs: Option<T>, a: Option<A>, b: Option<B>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, C, U>                     (lhs: Option<T>, a: Option<A>, b: Option<B>, c: Option<C>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, C, D, U>                  (lhs: Option<T>, a: Option<A>, b: Option<B>, c: Option<C>, d: Option<D>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, U>               (lhs: Option<T>, a: Option<A>, b: Option<B>, c: Option<C>, d: Option<D>, e: Option<E>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, U>            (lhs: Option<T>, a: Option<A>, b: Option<B>, c: Option<C>, d: Option<D>, e: Option<E>, f: Option<F>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, G, U>         (lhs: Option<T>, a: Option<A>, b: Option<B>, c: Option<C>, d: Option<D>, e: Option<E>, f: Option<F>, g: Option<G>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, G, H, U>      (lhs: Option<T>, a: Option<A>, b: Option<B>, c: Option<C>, d: Option<D>, e: Option<E>, f: Option<F>, g: Option<G>, h: Option<H>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function and<T, A, B, C, D, E, F, G, H, I, U>   (lhs: Option<T>, a: Option<A>, b: Option<B>, c: Option<C>, d: Option<D>, e: Option<E>, f: Option<F>, g: Option<G>, h: Option<H>, i: Option<I>, rhs: Option<U>): Option<U>;
// tslint:enable
export function and(...opt: Option<any>): Option<any> {
  return opt.reduce((lhs: Option<any>, rhs: Option<any>) =>
    isSome(lhs) ? rhs : None()
  );
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
 * expect(andThen(Some(2), sq, sq)).toEqual(Some(16));
 * expect(andThen(Some(2), sq, nope)).toEqual(None());
 * expect(andThen(Some(2), nope, sq)).toEqual(None());
 * expect(andThen(None(), sq, sq)).toEqual(None());
 * ```
 */
// tslint:disable
// prettier-ignore
export function andThen<T, U>                              (lhs: Option<T>, rhs: Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, U>                           (lhs: Option<T>, a: (t: T) => Option<A>, rhs: (a: A) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, U>                        (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, rhs: (b: B) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, C, U>                     (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, c: (b: B) => Option<C>, rhs: (c: C) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, C, D, U>                  (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, c: (b: B) => Option<C>, d: (c: C) => Option<D>, rhs: (d: D) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, C, D, E, U>               (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, c: (b: B) => Option<C>, d: (c: C) => Option<D>, e: (d: D) => Option<E>, rhs: (e: E) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, C, D, E, F, U>            (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, c: (b: B) => Option<C>, d: (c: C) => Option<D>, e: (d: D) => Option<E>, f: (e: E) => Option<F>, rhs: (f: F) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, C, D, E, F, G, U>         (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, c: (b: B) => Option<C>, d: (c: C) => Option<D>, e: (d: D) => Option<E>, f: (e: E) => Option<F>, g: (f: F) => Option<G>, rhs: (g: G) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, C, D, E, F, G, H, U>      (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, c: (b: B) => Option<C>, d: (c: C) => Option<D>, e: (d: D) => Option<E>, f: (e: E) => Option<F>, g: (f: F) => Option<G>, h: (g: G) => Option<H>, rhs: (h: H) => Option<U>): Option<U>;
// prettier-ignore
export function andThen<T, A, B, C, D, E, F, G, H, I, U>   (lhs: Option<T>, a: (t: T) => Option<A>, b: (a: A) => Option<B>, c: (b: B) => Option<C>, d: (c: C) => Option<D>, e: (d: D) => Option<E>, f: (e: E) => Option<F>, g: (f: F) => Option<G>, h: (g: G) => Option<H>, i: (h: H) => Option<I>, rhs: (i: I) => Option<U>): Option<U>;
// tslint:enable

export function andThen(
  opt: Option<any>,
  ...fn: Array<(val: any) => Option<any>>
): Option<any> {
  return fn.reduce(
    (val: Option<any>, op) => (isSome(val) ? op(val) : None()),
    opt
  );
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
 * expect(filter(None(0), isEven)).toEqual(None(0));
 * expect(filter(Some(3), isEven)).toEqual(None(0));
 * expect(filter(Some(4), isEven)).toEqual(Some(4));
 * ```
 */
export function filter<T>(
  opt: Option<T>,
  ...fn: Array<(val: T) => boolean>
): Option<T> {
  return fn.reduce(
    (val: Option<T>, op) => (isSome(val) && op(val) ? val : None()),
    opt
  );
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
 * expect(or(x, y)).toEqual(Some(2));
 *
 * x = None();
 * y = Some(100);
 *
 * expect(or(x, y)).toEqual(Some(100));
 *
 * x = Some(2);
 * y = Some(100);
 *
 * expect(or(x, y)).toEqual(Some(2));
 *
 * x = None();
 * y = None();
 * expect(or(x, y)).toEqual(None(0));
 * ```
 */
export function or<T>(opt: Option<T>, ...rhs: Array<Option<T>>): Option<T> {
  return rhs.reduce((lhs, r) => (isSome(lhs) ? lhs : r), opt);
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
 * expect(orElse(Some("barbarians"), vikings)).toEqual(Some("barbarians"));
 * expect(orElse(None(""), vikings)).toEqual(Some("vikings"));
 * expect(orElse(None(""), nobody)).toEqual(None(""));
 * ```
 */
export function orElse<T>(
  opt: Option<T>,
  ...fn: Array<() => Option<T>>
): Option<T> {
  return fn.reduce((o, op) => (isSome(o) ? o : op()), opt);
}
/**
 * Represents a present optional value.
 *
 * @param value The value to wrap.
 */
export function Some<T>(value: T): Option<T> {
  return value;
}

/**
 * Represents a missing optional value.
 *
 * @param _hint An optional value that can be used for type-hinting.
 *
 * This convenience method uses a type-hinting parameter to get better
 * implicit types for TypeScript. In JavaScript there is no reason to
 * use the `_hint` parameter; it is no-op.
 */
export function None<T>(_hint?: T): Option<T> {
  return void 0;
}
