import type { Action } from '@sketch/shared';

/** Draws one line through logical points [x, y, ...] at `scale` device pixels per logical unit. */
export function drawLine(ctx: CanvasRenderingContext2D, color: string, size: number, points: number[], scale: number): void {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0] * scale, points[1] * scale);
  // A single point still shows as a dot: a zero-length line with round caps.
  if (points.length === 2) ctx.lineTo(points[0] * scale, points[1] * scale);
  for (let i = 2; i + 1 < points.length; i += 2) ctx.lineTo(points[i] * scale, points[i + 1] * scale);
  ctx.stroke();
}

export function drawAction(ctx: CanvasRenderingContext2D, a: Action, scale: number): void {
  drawLine(ctx, a.color, a.size, a.points, scale);
}

/** Repaints the whole canvas from the turn's action log (ADR-003). */
export function replay(ctx: CanvasRenderingContext2D, log: Action[], scale: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const a of log) drawAction(ctx, a, scale);
}
