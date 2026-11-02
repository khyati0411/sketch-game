import { useEffect, useRef, type PointerEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { BATCH_MS, CANVAS_H, CANVAS_W, EV, type Action, type StrokeBegin, type StrokePoints } from '@sketch/shared';
import { drawLine, replay } from './render';

// Sprint 1 pen; the palette and sizes arrive with US-006.
const PEN = { color: '#000000', size: 10 };

// crypto.randomUUID needs a secure context, and LAN links are plain http.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** The shared canvas: the drawer's input streams out in batches, everyone renders the action log (ADR-003). */
export function Canvas({ canDraw, socket }: { canDraw: boolean; socket: Socket }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const log = useRef<Action[]>([]);
  const scale = useRef(1);
  const pen = useRef<{ stroke: Action; pending: number[]; timer: ReturnType<typeof setInterval> }>();

  const ctx = () => ref.current?.getContext('2d') ?? undefined;

  // Size the backing store to the element (and pixel ratio), then repaint from the log.
  useEffect(() => {
    const canvas = ref.current!;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round((canvas.clientWidth * ratio * CANVAS_H) / CANVAS_W);
      scale.current = canvas.width / CANVAS_W;
      const c = ctx();
      if (c) replay(c, log.current, scale.current);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, []);

  // Strokes from the drawer, and the full log when joining mid-turn.
  useEffect(() => {
    const onBegin = (b: StrokeBegin) => {
      const stroke: Action = { kind: 'stroke', id: b.id, color: b.color, size: b.size, points: [b.x, b.y] };
      log.current.push(stroke);
      const c = ctx();
      if (c) drawLine(c, stroke.color, stroke.size, stroke.points, scale.current);
    };
    const onPoints = (p: StrokePoints) => {
      const stroke = [...log.current].reverse().find((a) => a.id === p.id);
      if (!stroke) return;
      const from = stroke.points.slice(-2);
      stroke.points.push(...p.points);
      const c = ctx();
      if (c) drawLine(c, stroke.color, stroke.size, [...from, ...p.points], scale.current);
    };
    const onSync = (actions: Action[]) => {
      log.current = actions;
      const c = ctx();
      if (c) replay(c, log.current, scale.current);
    };
    socket.on(EV.drawBegin, onBegin);
    socket.on(EV.drawPoints, onPoints);
    socket.on(EV.canvasSync, onSync);
    return () => {
      socket.off(EV.drawBegin, onBegin);
      socket.off(EV.drawPoints, onPoints);
      socket.off(EV.canvasSync, onSync);
    };
  }, [socket]);

  const logical = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * CANVAS_W), Math.round(((e.clientY - r.top) / r.height) * CANVAS_H)];
  };

  const flush = () => {
    const p = pen.current;
    if (p?.pending.length) socket.emit(EV.drawPoints, { id: p.stroke.id, points: p.pending.splice(0) });
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || pen.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = logical(e);
    const stroke: Action = { kind: 'stroke', id: newId(), ...PEN, points: [x, y] };
    log.current.push(stroke);
    socket.emit(EV.drawBegin, { id: stroke.id, ...PEN, x, y });
    pen.current = { stroke, pending: [], timer: setInterval(flush, BATCH_MS) };
    const c = ctx();
    if (c) drawLine(c, PEN.color, PEN.size, stroke.points, scale.current);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pen.current;
    if (!p) return;
    const point = logical(e);
    const from = p.stroke.points.slice(-2);
    p.stroke.points.push(...point);
    p.pending.push(...point);
    const c = ctx();
    if (c) drawLine(c, PEN.color, PEN.size, [...from, ...point], scale.current);
  };

  const up = () => {
    const p = pen.current;
    if (!p) return;
    clearInterval(p.timer);
    flush();
    socket.emit(EV.drawEnd, p.stroke.id);
    pen.current = undefined;
  };

  return (
    <canvas
      ref={ref}
      data-testid="canvas"
      aria-label={canDraw ? 'Drawing canvas: draw here' : 'Drawing canvas'}
      style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', background: '#ffffff', borderRadius: 'var(--radius-panel)', touchAction: 'none', cursor: canDraw ? 'crosshair' : 'default' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    />
  );
}
