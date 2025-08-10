# Oxidize

Yet another Rust-inspired TypeScript / JavaScript utility library.

This library was created to lower the cognitive load of writing a library which
could throw errors from low-levels that needed to be propagated and handled at
high-levels. Rather than using a series of `try/catch` blocks, I decided to
translate some common utility structures from Rust to make it easier to keep
track of which functions were generating errors further "up" in the program.

This library also focuses on trying to synchronize with normal `TypeScript` and
`JavaScript`. Probably the most common example is the ability to wrap code
blocks in `Result.wrap()` to create `Results` and the ability to use
`result.unwrap()` to return a value or throw the error. Since the error stack
is generated when an `Error` is created, the stack and message will be
preserved and continue to trace back to the source where the error originated.

## Installation and Use

Oxidize can be installed from NPM:

```bash
npm install [--global --save-dev --save] oxidize
```

For most use-cases, the default import should be sufficient:

```javascript
const oxidize = require("oxidize");
```

For less common use-cases, though, you may want greater control over how your
dependencies are written:

- CommonJS: `const oxidize = require("oxidize");`
- ES Modules: `import { Ok, None } from "oxidize";`

## Features

### Result

The `Result` type provides an error-handling structure that makes
error-handling deliberate and explicit.

Error-handling is a common software engineering problem in any non-trivial
project. JavaScript's built-in error-handling involves thrown exceptions
and `try...catch` statements. This is a simple and (often) effective tool
that has one major flaw:

```typescript
const A = () => B();
const B = () => C();
const C = () => D();
const E = () => F();
const F = () => {
  throw new Error("Foo");
};
```

In a non-trivial system, where functions `A` and `F` may not be in the same
file, it is unrealistic to expect the author of function `A` to know that
they they will need to `catch` an error.

`Result<T, F>` is the type used for explicitly returning and propagating
errors in a way that makes error-handling straightforward.

```typescript
type Version = 1 | 2;

function parseVersion(header: number[]): Result<Version, string> {
  switch (header[0]) {
    case null:
      return Fail("invalid header length");
    case 1:
      return Ok(1);
    case 2:
      return Ok(2);
    default:
      return Fail("invalid version");
  }
}

const version = parseVersion([1, 2, 3, 4]);
version.match({
  Ok(v) {
    console.log(`Working with version: ${v}`);
  },
  Fail(f) {
    console.error(`Error parsing header: ${f}`);
  },
});
```

It's not always possible to do this, though. For example, if a dependency
library provides a function that can `throw`, then being able to consume
those thrown values as `Result`s would result in some non-ergonomic code:

```typescript
function throwEven(n: number) {
  if (n % 2 === 0) {
    throw new Error(`Even number thrown: ${n}`);
  }
  return n;
}

let result;
try {
  result = Some(throwEven(2));
} catch (e) {
  result = None();
}
```

In these cases, we can use `Result.wrap` to automatically collect those
values with less syntactical cruft:

```typescript
const result = Result.wrap(() => throwEven(2));
```

Pattern matching on `Result` is clear and straightforward for simple cases,
but `Result` comes with some Rust-inspired convenience methods that make
working with it more succinct.

The `isOk` and `isErr` methods do what they say:

```typescript
let goodResult: Result<number, number> = Ok(10);
let badResult: Result<number, number> = Fail(10);

expect(goodResult.isOk() && !goodResult.isFail()).toBe(true);
expect(badResult.isFail() && !badResult.isOk()).toBe(true);
```

The `map` consumes the `Result` and produces another:

```typescript
goodResult = goodResult.map((i) => i + 1);
badResult = badResult.map((i) => i - 1);
```

Use `andThen` to continue the computation:

```typescript
let convertedResult: Result<bool, number> = goodResult.andThen((i) =>
  Ok(i === 11),
);
```

Use `orElse` to handle the error:

```typescript
let fixedResult: Result<number, number> = badResult.orElse((i) => Ok(i + 20));
```

Extract the value with `unwrap` if the value is valid:

```typescript
let finalResult: number = fixedResult.unwrap();
```

### Option

Makes optional values explicit.

For function parameters in TypeScript, it is usually preferred to use the `?`
symbol or to use a default value to identify an optional parameter:

```typescript
function double(n: number = 0) {
  return n * 2;
}

function toString(n?: string) {
  if (n) {
    return n;
  }
  return "";
}
```

Type `Option` represents an optional value, where every `Option` is either
`Some` and contains a value, or `None` and does not. In TypeScript, this is
usually represented as either `T | null` or `val?: T`; and in most cases,
this is sufficient. However, sometimes it is syntactically unclear whether
an `undefined` or `null` value represents a deliberate "missing" value or
is caused by an upstream logic error. The `Option` class fills this void
by making these choices explicit and enforcing them at runtime.

```typescript
function divide(numerator: number, denominator: number): Option<number> {
  if (denominator === 0) {
    return None();
  } else {
    return Some(numerator / denominator);
  }
}

// The return value of the function is an `Option<number>`
const result = divide(2, 3);

if (result.isSome()) {
  console.log(`Result: ${result.unwrap()}`);
} else {
  console.log("Cannot divide by 0");
}
```

In the above case, the `Option<number>` value is taking the place of a
recoverable error to prevent an operation could result in `Infinity`,
or `NaN`. When passing the result of this function around, it is not
always clear that you will need to account for the _technically allowed_
but not necessarily _desirable_ behavior of returning those special
number values.

Using `Option<T>` makes those potential failures explicit, and allows
you to correct the cause of bugs at their source without disrupting the
code where those buggy values would be received.

The `if/else` pattern is common enough that there are some shorthand
functions, as well:

```typescript
let value = divide(2, 0).match({
  Some: (x) => x,
  None: () => 0,
});

value = divide(2, 0).unwrapOr(0);
```

The `Option.from<T>(val?: T | Option<T> | null)` function simplifies the
process of consuming normal JavaScript values and converts them into
`Option<T>` instances by interpreting `null` and `undefined` values to
be `None<T>`, and anything else to be `Some<T>`.

This function will also check if a value is already an `Option` and, if
so, then it will return that `Option` instead. This approach could be
overkill in trivial cases; but it does simplify the process of interacting
with other `Option` values.

```typescript
function double(number?: number): number {
  const maybeNumber = Option.from(number);
  return maybeNumber.unwrapOr(0) * 2;
}

expect(double()).toBe(0);
expect(double(1)).toBe(2);
expect(double(None())).toBe(0);
expect(double(Some(2))).toBe(4);
```
