import { None } from "./options";
import { pipe } from "./pipe";
import {
  and,
  andThen,
  arrayToResult,
  Fail,
  failOption,
  getResult,
  getResultAsync,
  isFail,
  isOk,
  map,
  mapFail,
  match,
  objectToResult,
  Ok,
  okOption,
  or,
  orElse,
  Result,
  unwrap,
  unwrapOr,
  unwrapOrElse
} from "./result";

test("Basic Result<T> functionality works", () => {
  type Version = 1 | 2;

  function parseVersion(header: number[]): Result<Version> {
    switch (header[0]) {
      case null:
      case void 0:
        return Fail("invalid header length");
      case 1:
        return Ok(1 as Version);
      case 2:
        return Ok(2 as Version);
      default:
        return Fail("invalid version");
    }
  }

  expect(
    match(parseVersion([1, 2, 3, 4]), {
      Ok: v => v,
      Fail: f => f
    })
  ).toBe(1);

  expect(
    match(parseVersion([2, 3, 4, 1]), {
      Ok: v => v,
      Fail: f => f
    })
  ).toBe(2);

  expect(
    match(parseVersion([3, 4, 1, 2]), {
      Ok: v => v,
      Fail: f => f
    })
  ).toEqual(Fail("invalid version"));

  expect(
    match(parseVersion([]), {
      Ok: v => v,
      Fail: f => f
    })
  ).toEqual(Fail("invalid header length"));
});

test("isOk() returns `true` if the result is `Ok`", () => {
  const x: Result<number> = Ok(-3);
  expect(isOk(x)).toBe(true);

  const y: Result<number> = Fail("Some error message");
  expect(isOk(y)).toBe(false);
});

test("isFail() returns `true` if the result is `Fail`", () => {
  const x = Ok(-3);
  expect(isFail(x)).toBe(false);

  const y = Fail("Some error message");
  expect(isFail(y)).toBe(true);
});

test("okToOption() converts from `Result<T>` to `Option<T>`, and discards failures", () => {
  const x = Ok(2);
  expect(okOption(x)).toBe(2);

  const y = Fail("Nothing here");
  expect(okOption(y)).toBe(None());
});

test("failToOption() converts from `Result<T>` to `Option<T>`, and discards values", () => {
  const x = Ok(2);
  expect(failOption(x)).toBe(None());

  const y = Fail("Nothing here");
  expect(failOption(y)).toEqual(Fail("Nothing here"));
});

test("map() maps a `Result<T, F>` to `Result<U, F>`", () => {
  expect(
    pipe(
      Ok(2),
      n => map(n, v => `${v}`),
      okOption
    )
  ).toBe("2");

  expect(
    pipe(
      Fail("Deliberate failure"),
      n => map(n, v => `${v}`),
      okOption
    )
  ).toBe(None());
});

test("mapFail() maps a `Result<T, F>` to `Result<T, U>`", () => {
  expect(
    pipe(
      mapFail(Fail("Failed to create a value"), f => `${f}: 2`),
      failOption
    )
  ).toEqual(Fail("Failed to create a value: 2"));
  expect(
    pipe(
      mapFail(Ok(2), f => `${f}`),
      failOption
    )
  ).toBe(None());
});

test("and() short-circuit evaluates two `Result`s", () => {
  let x = Ok(2);
  let y = Fail("late error");

  expect(and(x, y)).toEqual(Fail("late error"));

  x = Fail("early error");
  y = Ok("foo");

  expect(and(x, y)).toEqual(Fail("early error"));

  x = Fail("not a 2");
  y = Fail("late error");

  expect(and(x, y)).toEqual(Fail("not a 2"));

  x = Ok(2);
  y = Ok("different result type");

  expect(and(x, y)).toEqual("different result type");
});

test("or() returns `rhs` if `this` is `Fail`, or else returns `this`", () => {
  let x = Ok(2);
  let y = Fail("late error");

  expect(or(x, y)).toEqual(Ok(2));

  x = Fail("early error");
  y = Ok(2);

  expect(or(x, y)).toEqual(Ok(2));

  x = Fail("not a 2");
  y = Fail("late error");

  expect(or(x, y)).toEqual(Fail("late error"));

  x = Ok(2);
  y = Ok(100);

  expect(or(x, y)).toEqual(Ok(2));
});

test("andThen() calls `op` if the result is `Ok`. Otherwise, returns `this` as `Fail`", () => {
  const sq = (x: number): Result<number> => Ok(x * x);
  const err = (x: number): Result<number> => Fail(`Failed: ${x}`);

  expect(
    pipe(
      Ok(2),
      n => andThen(n, sq),
      n => andThen(n, sq)
    )
  ).toEqual(Ok(16));
  expect(
    pipe(
      Ok(2),
      n => andThen(n, sq),
      n => andThen(n, err)
    )
  ).toEqual(Fail("Failed: 4"));
  expect(
    pipe(
      Ok(2),
      n => andThen(n, err),
      n => andThen(n, sq)
    )
  ).toEqual(Fail("Failed: 2"));
  expect(
    pipe(
      Fail<number>("Failed: 3"),
      n => andThen(n, sq),
      n => andThen(n, sq)
    )
  ).toEqual(Fail("Failed: 3"));
});

test("orElse() calls `op` if `this` is `Fail`, otherwise returns `this`", () => {
  const sq = (): Result<number> => 1;
  const err = (): Result<number> => Fail("Failed");

  expect(orElse(2, sq, sq)).toEqual(2);
  expect(orElse(2, err, sq)).toEqual(Ok(2));
  expect(orElse(Fail("Error: 3"), sq, err)).toEqual(Ok(1));
  expect(orElse(Fail("Error: 3"), err, err)).toEqual(Fail("Failed"));
});

test("unwrap() throws if the value is a `Fail` with a panic message provided by the `Err` value", () => {
  expect(Ok(2)).toEqual(Ok(2));
  expect(() =>
    pipe(
      Fail("emergency failure"),
      unwrap
    )
  ).toThrow();
});

test("unwrapOr() unwraps a result, yielding the content of an `Ok`. Else, it returns `optb`", () => {
  expect(unwrapOr(Ok(9), 2)).toBe(9);
  expect(unwrapOr(Fail("error"), Ok(2))).toBe(2);
});

test("unwrapOrElse() unwraps a result, yielding the content of an `Ok`, or else the result of `op()`", () => {
  const count = () => 3;
  expect(unwrapOrElse(Ok(2), count)).toBe(2);
  expect(unwrapOrElse(Fail("foo"), count)).toBe(3);
});

test("match() provides a convenient interface for checking `Ok` and `Fail` branches", () => {
  expect(
    match(Fail<number>("Error: 7"), {
      Ok: x => x * 3,
      Fail: () => 14
    })
  ).toBe(14);
  expect(
    match(Ok(7), {
      Ok: x => x * 3,
      Fail: () => 14
    })
  ).toBe(21);
});

test("static fromArray() provides an interface for parsing an array of Results", () => {
  expect(arrayToResult([Ok(1), Ok(2), Ok(3)])).toEqual(Ok([1, 2, 3]));
  expect(arrayToResult([Ok(1), Ok(2), Fail("3")])).toEqual(Fail("3"));
  expect(arrayToResult([Ok(1), Fail("2"), Ok(3)])).toEqual(Fail("2"));
  expect(arrayToResult([Ok(1), Fail("2"), Fail("3")])).toEqual(Fail("2"));
  expect(arrayToResult([Fail("1"), Ok(2), Ok(3)])).toEqual(Fail("1"));
  expect(arrayToResult([Fail("1"), Ok(2), Fail("3")])).toEqual(Fail("1"));
  expect(arrayToResult([Fail("1"), Fail("2"), Ok(3)])).toEqual(Fail("1"));
  expect(arrayToResult([Fail("1"), Fail("2"), Fail("3")])).toEqual(Fail("1"));
});

test("static wrap() can capture success and thrown errors from a function", () => {
  expect(getResult(() => 7)).toEqual(Ok(7));
  expect(
    getResult(() => {
      throw new Error("foo");
    })
  ).toEqual(Fail("foo"));
});

test("static wrapAsync() can capture success and thrown errors from a Promise", async () => {
  expect(await getResultAsync(async () => 7)).toEqual(Ok(7));
  expect(
    await getResultAsync(async () => {
      throw new Error("foo");
    })
  ).toEqual(Fail("foo"));
});

test("static fromObject() can capture many results on a dictionary", () => {
  const results = {
    a: Ok(1),
    b: Ok(2),
    c: Ok(3),
    d: getResult(() => 4)
  };

  expect(objectToResult(results)).toEqual(Ok({ a: 1, b: 2, c: 3, d: 4 }));

  const withFail = {
    a: Ok(1),
    b: Fail("2"),
    c: Fail("3")
  };

  expect(objectToResult(withFail)).toEqual(Fail("2"));

  const withValues = {
    a: Ok(1),
    b: 2,
    c: Ok(3)
  };

  expect(objectToResult(withValues)).toEqual(Ok({ a: 1, b: 2, c: 3 }));

  const withFailAndValues = {
    a: Ok(1),
    b: 2,
    c: Fail("3")
  };

  expect(objectToResult(withFailAndValues)).toEqual(Fail("3"));
});
