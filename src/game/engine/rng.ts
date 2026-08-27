import type { RngState } from "@/game/domain/career";
import { gameError, type GameResult } from "@/game/domain/errors";

export interface RandomResult<T> { readonly value: T; readonly state: RngState }

const hashSeed = (text: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const seedRng = (seed: string): RngState => ({ seed: hashSeed(seed), cursor: 0 });

export const nextFloat = (state: RngState): RandomResult<number> => {
  let value = (state.seed + Math.imul(state.cursor + 1, 0x6d2b79f5)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const output = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  return { value: output, state: { ...state, cursor: state.cursor + 1 } };
};

export const nextInt = (state: RngState, min: number, max: number): RandomResult<number> => {
  const draw = nextFloat(state);
  const span = max - min + 1;
  return { value: min + Math.floor(draw.value * span), state: draw.state };
};

export const pickWeighted = <T>(
  state: RngState,
  items: readonly { value: T; weight: number }[],
): GameResult<RandomResult<T>> => {
  const valid = items.filter((item) => Number.isFinite(item.weight) && item.weight > 0);
  const total = valid.reduce((sum, item) => sum + item.weight, 0);
  if (items.length === 0 || valid.length === 0 || total <= 0) {
    return gameError("INVALID_STATE", "Weighted pick requires at least one positive finite weight");
  }
  const draw = nextFloat(state);
  let remaining = draw.value * total;
  for (const item of valid) {
    remaining -= item.weight;
    if (remaining <= 0) return { ok: true, value: { value: item.value, state: draw.state } };
  }
  const last = valid[valid.length - 1]!;
  return { ok: true, value: { value: last.value, state: draw.state } };
};
