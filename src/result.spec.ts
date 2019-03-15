import { Fail, Ok, Result } from "./result";

test("Basic Result<T, F> functionality works", () => {
  type Version = 1 | 2;

  function parseVersion(header: number[]): Result<Version, string> {
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
    parseVersion([1, 2, 3, 4]).match({
      Ok: v => v,
      Fail: f => f
    })
  ).toBe(1);

  expect(
    parseVersion([2, 3, 4, 1]).match({
      Ok: v => v,
      Fail: f => f
    })
  ).toBe(2);

  expect(
    parseVersion([3, 4, 1, 2]).match({
      Ok: v => v,
      Fail: f => f
    })
  ).toBe("invalid version");

  expect(
    parseVersion([]).match({
      Ok: v => v,
      Fail: f => f
    })
  ).toBe("invalid header length");
});

test("Result<T, F> file documentation examples", () => {
  let goodResult: Result<number, number> = Ok(10);
  let badResult: Result<number, number> = Fail(10);

  expect(goodResult.isOk() && !goodResult.isFail()).toBe(true);
  expect(badResult.isFail() && !badResult.isOk()).toBe(true);

  goodResult = goodResult.map(i => i + 1);
  badResult = badResult.map(i => i - 1);

  expect(goodResult.unwrap()).toBe(11);
  expect(() => badResult.unwrap()).toThrow();

  const convertedResult = goodResult.andThen(i => Ok<boolean>(i === 11));
  const fixedResult: Result<number, number> = badResult.orElse(i => Ok(i + 20));

  expect(convertedResult.unwrap()).toBe(true);
  expect(fixedResult.unwrap()).toBe(30);

  const finalResult: number = fixedResult.unwrap();
  expect(finalResult).toBe(30);
});

test("isOk() returns `true` if the result is `Ok`", () => {
  const x: Result<number, string> = Ok(-3);
  expect(x.isOk()).toBe(true);

  const y: Result<number, string> = Fail("Some error message");
  expect(y.isOk()).toBe(false);
});

test("isFail() returns `true` if the result is `Fail`", () => {
  const x: Result<number, string> = Ok(-3);
  expect(x.isFail()).toBe(false);

  const y: Result<number, string> = Fail("Some error message");
  expect(y.isFail()).toBe(true);
});

test("ok() converts from `Result<T, F>` to `T | null`, and discards `F`", () => {
  const x = Ok(2);
  expect(x.ok()).toBe(2);

  const y = Fail("Nothing here");
  expect(y.ok()).toBe(null);
});

test("fail() converts from `Result<T, F>` to `F | null`, and discards `T`", () => {
  const x = Ok(2);
  expect(x.fail()).toBe(null);

  const y = Fail("Nothing here");
  expect(y.fail()).toBe("Nothing here");
});

test("map() maps a `Result<T, F>` to `Result<U, F>`", () => {
  // prettier-ignore
  expect(Ok(2).map(v => `${v}`).ok()).toBe("2");
  // prettier-ignore
  expect(Fail(2).map(v => `${v}`).ok()).toBe(null);
});

test("mapFail() maps a `Result<T, F>` to `Result<T, U>`", () => {
  // prettier-ignore
  expect(Fail(2).mapFail(f => `${f}`).fail()).toBe("2");
  // prettier-ignore
  expect(Ok(2).mapFail(f => `${f}`).fail()).toBe(null);
});

test("and() short-circuit evaluates two `Result`s", () => {
  let x = Ok(2);
  let y = Fail("late error");

  expect(x.and(y).fail()).toBe("late error");

  x = Fail("early error");
  y = Ok("foo");

  expect(x.and(y).fail()).toBe("early error");

  x = Fail("not a 2");
  y = Fail("late error");

  expect(x.and(y).fail()).toBe("not a 2");

  x = Ok(2);
  y = Ok("different result type");

  expect(x.and(y).ok()).toBe("different result type");
});

test("or() returns `rhs` if `this` is `Fail`, or else returns `this`", () => {
  let x = Ok(2);
  let y = Fail("late error");

  expect(x.or(y)).toEqual(Ok(2));

  x = Fail("early error");
  y = Ok(2);

  expect(x.or(y)).toEqual(Ok(2));

  x = Fail("not a 2");
  y = Fail("late error");

  expect(x.or(y)).toEqual(Fail("late error"));

  x = Ok(2);
  y = Ok(100);

  expect(x.or(y)).toEqual(Ok(2));
});

test("andThen() calls `op` if the result is `Ok`. Otherwise, returns `this` as `Fail`", () => {
  const sq = (x: number): Result<number, number> => Ok(x * x);
  const err = (x: number): Result<number, number> => Fail(x);

  expect(
    Ok(2)
      .andThen(sq)
      .andThen(sq)
  ).toEqual(Ok(16));
  expect(
    Ok(2)
      .andThen(sq)
      .andThen(err)
  ).toEqual(Fail(4));
  expect(
    Ok(2)
      .andThen(err)
      .andThen(sq)
  ).toEqual(Fail(2));
  expect(
    Fail(3)
      .andThen(sq)
      .andThen(sq)
  ).toEqual(Fail(3));
});

test("orElse() calls `op` if `this` is `Fail`, otherwise returns `this`", () => {
  const sq = (x: number): Result<number, number> => Ok(x * x);
  const err = (x: number): Result<number, number> => Fail(x);

  expect(
    Ok(2)
      .orElse(sq)
      .orElse(sq)
  ).toEqual(Ok(2));
  expect(
    Ok(2)
      .orElse(err)
      .orElse(sq)
  ).toEqual(Ok(2));
  expect(
    Fail(3)
      .orElse(sq)
      .orElse(err)
  ).toEqual(Ok(9));
  expect(
    Fail(3)
      .orElse(err)
      .orElse(err)
  ).toEqual(Fail(3));
});

test("unwrap() throws if the value is a `Fail` with a panic message provided by the `Err` value", () => {
  expect(Ok(2)).toEqual(Ok(2));
  expect(() => Fail("emergency failure").unwrap()).toThrow();
});

test("unwrapOr() unwraps a result, yielding the content of an `Ok`. Else, it returns `optb`", () => {
  expect(Ok(9).unwrapOr(2)).toBe(9);
  expect(Fail("error").unwrapOr(2)).toBe(2);
});

test("unwrapOrElse() unwraps a result, yielding the content of an `Ok`, or else the result of `op()`", () => {
  const count = (x: string) => x.length;
  expect(Ok(2).unwrapOrElse(count)).toBe(2);
  expect(Fail("foo").unwrapOrElse(count)).toBe(3);
});

test("match() provides a convenient interface for checking `Ok` and `Fail` branches", () => {
  expect(
    Fail(7).match({
      Ok: x => x * 3,
      Fail: y => y * 2
    })
  ).toBe(14);
  expect(
    Ok(7).match({
      Ok: x => x * 3,
      Fail: y => y * 2
    })
  ).toBe(21);
});

test("static fromArray() provides an interface for parsing an array of Results", () => {
  expect(Result.fromArray([Ok(1), Ok(2), Ok(3)])).toEqual(Ok([1, 2, 3]));
  expect(Result.fromArray([Ok(1), Ok(2), Fail(3)])).toEqual(Fail(3));
  expect(Result.fromArray([Ok(1), Fail(2), Ok(3)])).toEqual(Fail(2));
  expect(Result.fromArray([Ok(1), Fail(2), Fail(3)])).toEqual(Fail(2));
  expect(Result.fromArray([Fail(1), Ok(2), Ok(3)])).toEqual(Fail(1));
  expect(Result.fromArray([Fail(1), Ok(2), Fail(3)])).toEqual(Fail(1));
  expect(Result.fromArray([Fail(1), Fail(2), Ok(3)])).toEqual(Fail(1));
  expect(Result.fromArray([Fail(1), Fail(2), Fail(3)])).toEqual(Fail(1));
});

test("static wrap() can capture success and thrown errors from a function", () => {
  expect(Result.wrap(() => 7)).toEqual(Ok(7));
  expect(
    Result.wrap(() => {
      throw new Error("foo");
    })
  ).toEqual(Fail(new Error("foo")));
});

test("static wrapAsync() can capture success and thrown errors from a Promise", async () => {
  expect(await Result.wrapAsync(async () => 7)).toEqual(Ok(7));
  expect(
    await Result.wrapAsync(async () => {
      throw new Error("foo");
    })
  ).toEqual(Fail(new Error("foo")));
});

test("static fromObject() can capture many results on a dictionary", () => {
  const results = {
    a: Ok(1),
    b: Ok(2),
    c: Ok(3),
    d: Result.wrap(() => 4)
  };

  expect(Result.fromObject(results)).toEqual(Ok({ a: 1, b: 2, c: 3, d: 4 }));

  const withFail = {
    a: Ok(1),
    b: Fail(2),
    c: Fail(3)
  };

  expect(Result.fromObject(withFail)).toEqual(Fail(2));

  const withValues = {
    a: Ok(1),
    b: 2,
    c: Ok(3)
  };

  expect(Result.fromObject(withValues)).toEqual(Ok({ a: 1, b: 2, c: 3 }));

  const withFailAndValues = {
    a: Ok(1),
    b: 2,
    c: Fail(3)
  };

  expect(Result.fromObject(withFailAndValues)).toEqual(Fail(3));
});
