import { pipe } from "./pipe";

test("recursively pushes values from one result into the next", () => {
  const double = (x: number) => x * 2;

  expect(
    pipe(
      1,
      double,
      double,
      double,
      double
    )
  ).toBe(16);
});

test("can also process async pipes", async () => {
  const double = async (x: Promise<number>) =>
    new Promise<number>(resolve => {
      setTimeout(async () => {
        resolve((await x) * 2);
      }, 0);
    });

  expect(
    pipe(
      Promise.resolve(1),
      double,
      double,
      double,
      double
    )
  );
});
