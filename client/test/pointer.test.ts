import { describe, it, expect } from 'vitest';
import { toLogical, PointerLock } from '../src/canvas/pointer';

const rect = { left: 100, top: 50, width: 400, height: 300 };

describe('toLogical', () => {
  it('maps screen coordinates to the 800 × 600 logical canvas', () => {
    expect(toLogical(300, 200, rect)).toEqual([400, 300]);
  });

  it('clamps points dragged off the canvas, exactly like the server', () => {
    expect(toLogical(0, 0, rect)).toEqual([0, 0]);
    expect(toLogical(900, 900, rect)).toEqual([800, 600]);
  });
});

describe('PointerLock', () => {
  it('follows only the pointer that started the stroke', () => {
    const lock = new PointerLock();
    expect(lock.take(1)).toBe(true);
    expect(lock.take(2)).toBe(false); // a second finger cannot start another stroke
    expect(lock.owns(2)).toBe(false); // and its moves are ignored
    expect(lock.release(2)).toBe(false); // lifting it does not end the stroke
    expect(lock.owns(1)).toBe(true);
    expect(lock.release(1)).toBe(true);
    expect(lock.take(2)).toBe(true);
  });
});
