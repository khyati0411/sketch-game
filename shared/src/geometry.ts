import { CANVAS_H, CANVAS_W } from './constants';

/** Rounds a logical point and clamps it to the canvas. Client and server use the same rule (ADR-003). */
export function clampPoint(x: number, y: number): [number, number] {
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
  return [clamp(x, CANVAS_W), clamp(y, CANVAS_H)];
}
