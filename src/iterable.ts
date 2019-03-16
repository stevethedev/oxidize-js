import { Option } from "./options";

/**
 * Provides a generic interface for dealing with iterators.
 */
export interface Iterable<Item> extends IterableIterator<Item> {
  /**
   * Advances the iterator and returns the next value.
   *
   * This iterable format intentionally diverges from the Rust specification
   * in order to facilitate the `for...of` iteration pattern. Individual
   * iterator implementations may choose to resume iteration, and so calling
   * `next()` again may or may not eventually start returning items again at
   * some point.
   *
   * ```typescript
   * const a = [1, 2, 3];
   * const iter = iterate(a);
   *
   * // A call to next() returns the next value...
   * expect(1).toBe(iter.next().value);
   * expect(2).toBe(iter.next().value);
   * expect(3).toBe(iter.next().value);
   *
   * // ... and then undefined once it's over.
   * expect(void 0).toBe(iter.next().value);
   *
   * // More calls may or may not return undefined. Here, they always will:
   * expect(void 0).toBe(iter.next().value);
   * expect(void 0).toBe(iter.next().value);
   * ```
   */
  next(): IteratorResult<Item>;

  /**
   * Advances the iterator and returns the next value.
   *
   * This is a wrapper around the `next()` method to make it easier to manually
   * pull values out of the iterator.
   *
   * ```typescript
   * const a = [1, 2, 3];
   * const iter = iterate(a);
   *
   * // A call to nextValue() returns the next value...
   * expect(Some(1)).toBe(iter.nextValue());
   * expect(Some(2)).toBe(iter.nextValue());
   * expect(Some(3)).toBe(iter.nextValue());
   *
   * // ... and then `None` once it's over.
   * expect(None(0)).toBe(iter.nextValue());
   *
   * // More calls may or may not return None(). Here, they always will:
   * expect(None(0)).toBe(iter.nextValue());
   * expect(None(0)).toBe(iter.nextValue());
   * ```
   */
  nextValue(): Option<Item>;

  /**
   * Returns the bounds on the remaining length of the iterator.
   *
   * Specifically, `size()` returns an `Option` that conveys the upper-bound
   * of the iterator. This is primarily intended to be used for optimizations
   * such as reserving space for the elements in the iterator, but there is
   * no guarantee that these boundaries will be stable.
   *
   * If the return value is `None`, this implies that the iterator will
   * never terminate.
   *
   * Basic Usage:
   *
   * ```typescript
   * const iter = iterate([1, 2, 3]);
   *
   * expect(Some(3)).toEqual(iter.size());
   * ```
   *
   * Complex example:
   *
   * ```typescript
   * // The even numbers from zero to ten
   * const iter = range(0, 10).filter(x => x % 2 === 0);
   *
   * // We might iterate from zero to ten times. Knowing that it's five exactly
   * // wouldn't be possible without executing filter().
   * expect(Some(10)).toEqual(iter.size());
   *
   * // Let's add five more numbers with chain()
   * let iter = range(0, 10).filter(x => x % 2 === 0).chain(15, 20);
   *
   * // Now both bounds are increased by five
   * expect(Some(15)).toEqual(iter.size());
   * ```
   *
   * Returning `None()` for an upper-bound
   *
   * ```typescript
   * const iter = range(0);
   * expect(None(0)).toEqual(iter.size());
   * ```
   */
  size(): Option<number>;

  /**
   * Consumes the iterator, counting the number of iterations and returning it.
   *
   * This method will evaluate the iterator until its `next` and returns
   * `None`. Once `None` is encountered, `count` returns the number of times
   * it called `next`.
   *
   * This method does not guard against overflows, so counting elements of a
   * non-terminating iterator, or whose max-size is greater than
   * `Number.MAX_SAFE_INTEGER` causes an `Error` to be thrown.
   *
   * @throws If the max-size is `> Number.MAX_SAFE_INTEGER`.
   *
   * ```typescript
   * const a = [1, 2, 3];
   * expect(iterate(a).count()).toBe(3);
   *
   * expect(() => range(0).count()).toThrow();
   * ```
   */
  count(): number;

  /**
   * Consumes the iterator, returning the last element.
   *
   * This method will evaluate the iterator until the end, and then returns
   * the last value it saw.
   *
   * ```typescript
   * expect(iterate([1, 2, 3]).last()).toEqual(Some(3));
   * ```
   */
  last(): Option<Item>;

  /**
   * Consumes the iterator up until the `n`th element.
   *
   * This method evaluates the iterator *in its current state*, so `nth(0)`
   * returns the first value, `nth(1)` the second, and so on.
   *
   * This also consumes all of the preceding elements, so requesting `nth(1)`
   * will consume and discard `nth(0)`. This also means that calling `nth(0)`
   * repeatedly will yield different results; this is equivalent to calling
   * `nextValue()`.
   *
   * Basic usage:
   *
   * ```typescript
   * expect(iterate([1, 2, 3]).nth(1)).toEqual(Some(2));
   * ```
   *
   * Calling `nth()` multiple times doesn't rewind the iterator.
   *
   * ```typescript
   * const iter = iterate([1, 2, 3]);
   *
   * expect(iter.nth(1)).toEqual(Some(2));
   * expect(iter.nth(1)).toEqual(None(0));
   * ```
   *
   * Returning `None` if there are less than `n + 1` elements.
   *
   * ```typescript
   * expect(iterate([1, 2, 3]).nth(10)).toEqual(None(0));
   * ```
   */
  nth(n: number): Option<Item>;

  /**
   * Creates an iterator starting at the same point, but with a custom step.
   *
   * @param step The number of elements to skip when stepping.
   *
   * Note that the first element of the iterator will always be returned,
   * regardless of the `step` given. This behaves like the sequence
   * `next()`, `nth(step - 1)`, `nth(step - 1)`, …
   *
   * @throws If the given step is 0 or less than zero.
   *
   * ```typescript
   * const a = [0, 1, 2, 3, 4, 5];
   * const iter = iterate(a).stepBy(2);
   *
   * expect(iter.nextValue()).toEqual(Some(0));
   * expect(iter.nextValue()).toEqual(Some(2));
   * expect(iter.nextValue()).toEqual(Some(4));
   * expect(iter.nextValue()).toEqual(None(0));
   * ```
   */
  stepBy(step: number): StepBy<Item>;

  /**
   * Takes two iterators and creates a new iteartor over both in sequence.
   *
   * @param other The iterator to append to this one.
   *
   * `chain()` will return a new iterator which will first iterate over the
   * values from the first iterator and then over the values of the second.
   *
   * ```typescript
   * const a1 = [1, 2, 3];
   * const a2 = [4, 5, 6];
   *
   * const iter = iterate(a1).chain(iterate(a2));
   *
   * expect(iter.nextValue()).toEqual(Some(1));
   * expect(iter.nextValue()).toEqual(Some(2));
   * expect(iter.nextValue()).toEqual(Some(3));
   * expect(iter.nextValue()).toEqual(Some(4));
   * expect(iter.nextValue()).toEqual(Some(5));
   * expect(iter.nextValue()).toEqual(Some(6));
   * expect(iter.nextValue()).toEqual(None(0));
   * ```
   */
  chain(other: IterableIterator<Item>): Iterable<Item>;
}

interface StepBy<Item> {}

export function iterate<T>(target: T[]) {
  return new Iterator();
}

export class Iterator {
  constructor(
    private start: number = 0,
    private end: number = Infinity,
    private step: number = 1
  ) {}

  public *iter() {
    for (let i = this.start; i < this.end; i += this.step) {
      yield i;
    }
  }

  public stepBy(step: number): Iterable {
    this.step = step;
    return this;
  }

  public map<T>(fn: (i: number) => T): T[] {
    const result: T[] = [];
    for (const i of this.iter()) {
      result.push(fn(i));
    }
    return result;
  }
}

export function range(start: number = 0, end: number = Infinity) {
  return new Iterable(start, end);
}
