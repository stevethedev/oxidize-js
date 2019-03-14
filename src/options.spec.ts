import { None, Option, Some } from "./options";
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
  const matches = {
    Some: x => `Result: ${x}`,
    None: () => "Cannot divide by 0"
  };

  expect(divide(2, 3).match(matches)).toBe(`Result: ${2 / 3}`);

  expect(divide(2, 0).match(matches)).toBe("Cannot divide by 0");
});

test("isSome() returns `true` if the option is a `Some` value.", () => {
  const x = Some(2);
  expect(x.isSome()).toBe(true);

  const y = None();
  expect(y.isSome()).toBe(false);
});

test("isNone() returns `true` if the option is `None`", () => {
  const x = Some(2);
  expect(x.isNone()).toBe(false);
  const y = None();
  expect(y.isNone()).toBe(true);
});

test("match() provides a convenient interface for checking `Ok` and `Fail` branches", () => {
  const match = {
    Some: x => x * 3,
    None: () => 0
  };

  expect(Some(7).match(match)).toBe(21);
  expect(None().match(match)).toBe(0);
});

test("can unwrap a value", () => {
  const x = Some("value");
  expect(x.unwrap("the world is ending")).toBe("value");
  const y = None();
  expect(() => y.unwrap()).toThrow();
});

test("can unwrap with a default value", () => {
  expect(Some("car").unwrapOr("bike")).toBe("car");
  expect(None().unwrapOr("bike")).toBe("bike");
});

test("can unwrap with a lazily executed function", () => {
  expect(Some("car").unwrapOrElse(() => "bike")).toBe("car");
  expect(None().unwrapOrElse(() => "bike")).toBe("bike");
});

test("can map Option<T> to Option<U>", () => {
  const maybeString = Some("Hello, world");
  const maybeLen = maybeString.map(s => s.length);
  expect(maybeLen).toEqual(Some(12));
  const possibleString = None<string>();
  const possibleLength = possibleString.map(s => s.length);
  expect(possibleLength).toEqual(None());
});

test("can mapOr Option<T> to U", () => {
  expect(Some("foo").mapOr(42, x => x.length)).toBe(3);
  expect(None<string>().mapOr(42, x => x.length)).toBe(42);
});

test("can mapOrElse to lazily evaluate two paths", () => {
  const k = 21;

  let x = Some("foo");
  expect(x.mapOrElse(() => 2 * k, v => v.length)).toBe(3);

  x = None();
  expect(x.mapOrElse(() => 2 * k, v => v.length)).toBe(42);
});

test("can convert `Option<T>` to `Result<T, F>`", () => {
  let x = Some("foo");
  expect(x.okOr(0)).toEqual(Ok("foo"));
  x = None();
  expect(x.okOr(0)).toEqual(Fail(0));
});

test("can convert `Option<T>` to `Result<T, F>`", () => {
  let x = Some("foo");
  expect(x.okOrElse(() => 0)).toEqual(Ok("foo"));

  x = None();
  expect(x.okOrElse(() => 0)).toEqual(Fail(0));
});

test("can join options together with `and`", () => {
  let x = Some(2);
  let y = None();

  expect(x.and(y)).toEqual(None());

  x = None();
  y = Some("foo");

  expect(x.and(y)).toEqual(None());

  x = Some(2);
  y = Some("foo");

  expect(x.and(y)).toEqual(Some("foo"));

  x = None();
  y = None();

  expect(x.and(y)).toEqual(None());
});

test("can convert undefined and null values into an Option", () => {
  function double(num?: number | Option<number>): number {
    const maybeNumber = Option.from<number>(num);
    return maybeNumber.unwrapOr(0) * 2;
  }

  expect(double()).toBe(0);
  expect(double(1)).toBe(2);
  expect(double(None())).toBe(0);
  expect(double(Some(2))).toBe(4);
});
