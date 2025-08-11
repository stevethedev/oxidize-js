export class Iterable {
  readonly #start: number;
  readonly #end: number;
  #step: number;

  constructor(start: number = 0, end: number = Infinity, step: number = 1) {
    this.#start = start;
    this.#end = end;
    this.#step = step;
  }

  public *iter() {
    for (let i = this.#start; i < this.#end; i += this.#step) {
      yield i;
    }
  }

  public stepBy(step: number): Iterable {
    this.#step = step;
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
