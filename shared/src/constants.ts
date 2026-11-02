// Values fixed by ADR-003 (drawing), ADR-004 (rooms) and ADR-007 (UI).

export const CANVAS_W = 800;
export const CANVAS_H = 600;
export const BRUSH_SIZES = [4, 10, 20, 40] as const;
export const BATCH_MS = 30;
export const MAX_POINTS_PER_TURN = 50_000;

export const PALETTE = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark grey', hex: '#7f7f7f' },
  { name: 'Light grey', hex: '#c3c3c3' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#e53935' },
  { name: 'Orange', hex: '#fb8c00' },
  { name: 'Yellow', hex: '#fdd835' },
  { name: 'Green', hex: '#43a047' },
  { name: 'Light green', hex: '#a5d6a7' },
  { name: 'Teal', hex: '#00acc1' },
  { name: 'Blue', hex: '#1e88e5' },
  { name: 'Indigo', hex: '#3949ab' },
  { name: 'Purple', hex: '#8e24aa' },
  { name: 'Pink', hex: '#d81b60' },
  { name: 'Light pink', hex: '#f8bbd0' },
  { name: 'Brown', hex: '#6d4c41' },
] as const;

export const PLAYER_COLORS = ['#4f9dff', '#3ddc84', '#ff5c8a', '#ffd166', '#b388ff', '#ff9f43', '#4dd0e1', '#ff6b6b'] as const;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const NAME_MAX = 20;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 6;
export const ROOM_TTL_MS = 300_000;
