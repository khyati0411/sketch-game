import { CANVAS_H, CANVAS_W, clampPoint } from '@sketch/shared';

type Rect = { left: number; top: number; width: number; height: number };

/** Screen coordinates to logical canvas points, clamped the same way the server clamps them. */
export function toLogical(clientX: number, clientY: number, r: Rect): [number, number] {
  return clampPoint(((clientX - r.left) / r.width) * CANVAS_W, ((clientY - r.top) / r.height) * CANVAS_H);
}

/** The pointer that owns the current stroke; other fingers are ignored until it lifts. */
export class PointerLock {
  private id: number | undefined;

  take(pointerId: number): boolean {
    if (this.id !== undefined) return false;
    this.id = pointerId;
    return true;
  }

  owns(pointerId: number): boolean {
    return this.id === pointerId;
  }

  release(pointerId: number): boolean {
    if (this.id !== pointerId) return false;
    this.id = undefined;
    return true;
  }
}
