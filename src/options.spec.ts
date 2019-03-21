import {
  and,
  andThen,
  filter,
  isNone,
  isSome,
  map,
  mapOr,
  mapOrElse,
  match,
  None,
  okOr,
  okOrElse,
  Option,
  or,
  orElse,
  Some,
  toOption,
  unwrap,
  unwrapOr,
  unwrapOrElse
} from "./options";
import { Fail, Ok } from "./result";

test("basic functionality", () => {
  function divide(numerator: number, denominator: number): Option<number> {
    if (denominator === 0) {
      return None();
    } else {
      return Some(numerator / denominator);
    }
  }

  // The return value of the function is an `Option`
  expect(
    match(divide(2, 3), {
      Some: x => `Result: ${x}`,
      None: () => "Cannot divide by 0"
    })
  ).toBe(`Result: ${2 / 3}`);

  expect(
    match(divide(2, 0), {
      Some: x => `Result: ${x}`,
      None: () => "Cannot divide by 0"
    })
  ).toBe("Cannot divide by 0");
});

test("isSome() returns `true` if the option is a `Some` value.", () => {
  const x = Some(2);
  expect(isSome(x)).toBe(true);

  const y = None();
  expect(isSome(y)).toBe(false);
});

test("isNone() returns `true` if the option is `None`", () => {
  const x = Some(2);
  expect(isNone(x)).toBe(false);
  const y = None();
  expect(isNone(y)).toBe(true);
});

test("match() provides a convenient interface for checking `Ok` and `Fail` branches", () => {
  let opt = Some(7);
  expect(
    match(opt, {
      Some: x => x * 3,
      None: () => 0
    })
  ).toBe(21);

  opt = None();
  expect(
    match(opt, {
      Some: x => x * 3,
      None: () => 0
    })
  ).toBe(0);
});

test("can unwrap a value", () => {
  const x = Some("value");
  expect(unwrap(x, "the world is ending")).toBe("value");
  const y = None();
  expect(() => unwrap(y)).toThrow();
});

test("can unwrap with a default value", () => {
  expect(unwrapOr(Some("car"), "bike")).toBe("car");
  expect(unwrapOr(None(), "bike")).toBe("bike");
});

test("can unwrap with a lazily executed function", () => {
  expect(unwrapOrElse(Some("car"), () => "bike")).toBe("car");
  expect(unwrapOrElse(None(), () => "bike")).toBe("bike");
});

test("can map Option<T> to Option<U>", () => {
  const maybeString = Some("Hello, world");
  const maybeLen = map(maybeString, s => s.length);
  expect(maybeLen).toEqual(Some(12));
  const possibleString = None<string>();
  const possibleLength = map(possibleString, s => s.length);
  expect(possibleLength).toEqual(None());
});

test("can mapOr Option<T> to U", () => {
  expect(mapOr(Some("foo"), 42, x => x.length)).toBe(3);
  expect(mapOr(None<string>(), 42, x => x.length)).toBe(42);
});

test("can mapOrElse to lazily evaluate two paths", () => {
  const k = 21;

  let x = Some("foo");
  expect(mapOrElse(x, () => 2 * k, v => v.length)).toBe(3);

  x = None();
  expect(mapOrElse(x, () => 2 * k, v => v.length)).toBe(42);
});

test("can convert `Option<T>` to `Result<T, F>`", () => {
  let x = Some("foo");
  expect(okOr(x, "bar")).toEqual(Ok("foo"));
  x = None();
  expect(okOr(x, "bar")).toEqual(Fail("bar"));
});

test("can convert `Option<T>` to `Result<T, F>`", () => {
  let x = Some("foo");
  expect(okOrElse(x, () => Ok("fail"))).toEqual(Ok("foo"));

  x = None();
  expect(okOrElse(x, () => Fail("fail"))).toEqual(Fail("fail"));
});

test("can join options together with `and`", () => {
  let x = Some(2);
  let y = None();

  expect(and(x, y)).toEqual(None());

  x = None();
  y = Some("foo");

  expect(and(x, y)).toEqual(None());

  x = Some(2);
  y = Some("foo");

  expect(and(x, y)).toEqual(Some("foo"));

  x = None();
  y = None();

  expect(and(x, y)).toEqual(None());
});

test("can convert undefined and null values into an Option", () => {
  function double(num?: number | Option<number>): number {
    const maybeNumber = toOption(num);
    return unwrapOr(maybeNumber, 0) * 2;
  }

  expect(double()).toBe(0);
  expect(double(1)).toBe(2);
  expect(double(None())).toBe(0);
  expect(double(Some(2))).toBe(4);
});

test("can lazily join Options with andThen()", () => {
  const sq = (x: number): Option<number> => Some(x * x);
  const nope = (_: number): Option<number> => None();

  expect(andThen(Some(2), sq, sq)).toEqual(Some(16));
  expect(andThen(Some(2), sq, nope)).toEqual(None());
  expect(andThen(Some(2), nope, sq)).toEqual(None());
  expect(andThen(None(0), sq, sq)).toEqual(None());
});

test("can use `filter()` to filter an Option", () => {
  const isEven = (n: number) => n % 2 === 0;

  expect(filter(None(0), isEven)).toEqual(None(0));
  expect(filter(Some(3), isEven)).toEqual(None(0));
  expect(filter(Some(4), isEven)).toEqual(Some(4));
});

test("can apply branching logic with `or()`", () => {
  let x = Some(2);
  let y = None(0);

  expect(or(x, y)).toEqual(Some(2));

  x = None();
  y = Some(100);

  expect(or(x, y)).toEqual(Some(100));

  x = Some(2);
  y = Some(100);

  expect(or(x, y)).toEqual(Some(2));

  x = None();
  y = None();
  expect(or(x, y)).toEqual(None(0));
});

test("can apply branching logic with `orElse()`", () => {
  const nobody = () => None("");
  const vikings = () => Some("vikings");

  expect(orElse(Some("barbarians"), vikings)).toEqual(Some("barbarians"));
  expect(orElse(None(""), vikings)).toEqual(Some("vikings"));
  expect(orElse(None(""), nobody)).toEqual(None(""));
});
