export class RNG {
  private state: number;
  public readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed;
  }

  // mulberry32 implementation
  random(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Returns a random number between min (inclusive) and max (exclusive)
  range(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  // Returns a random integer between min and max (inclusive)
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Returns true with the given probability
  chance(probability: number): boolean {
    return this.random() < probability;
  }
}
