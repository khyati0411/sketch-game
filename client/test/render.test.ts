import { describe, it, expect } from 'vitest';
import type { Action } from '@sketch/shared';
import { replay } from '../src/canvas/render';

/** A 2D context stand-in that records what was drawn. */
function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    canvas: { width: 400, height: 300 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    fillRect: (x: number, y: number, w: number, h: number) => calls.push(`fillRect ${ctx.fillStyle} ${x},${y},${w},${h}`),
    beginPath: () => calls.push('beginPath'),
    moveTo: (x: number, y: number) => calls.push(`moveTo ${x},${y}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo ${x},${y}`),
    stroke: () => calls.push(`stroke ${ctx.strokeStyle} ${ctx.lineWidth}`),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('replay', () => {
  it('paints the background white, then each stroke in order, scaled', () => {
    const { ctx, calls } = fakeContext();
    const log: Action[] = [
      { kind: 'stroke', id: 'a', color: '#e53935', size: 10, points: [100, 100, 200, 100] },
      { kind: 'stroke', id: 'b', color: '#1e88e5', size: 40, points: [0, 0] },
    ];
    replay(ctx, log, 0.5);
    expect(calls).toEqual([
      'fillRect #ffffff 0,0,400,300',
      'beginPath', 'moveTo 50,50', 'lineTo 100,50', 'stroke #e53935 5',
      // A single point still shows as a dot: a zero-length line with round caps.
      'beginPath', 'moveTo 0,0', 'lineTo 0,0', 'stroke #1e88e5 20',
    ]);
  });
});
