import type { PlayerAttributes } from "@/game/domain/player";
import type { PositionFamily } from "@/game/domain/world";

const weights: Record<PositionFamily, PlayerAttributes> = {
  goalkeeper: { technique: 0.25, awareness: 0.35, physical: 0.15, mentality: 0.25 },
  defender:   { technique: 0.15, awareness: 0.35, physical: 0.30, mentality: 0.20 },
  midfielder: { technique: 0.35, awareness: 0.30, physical: 0.15, mentality: 0.20 },
  forward:    { technique: 0.40, awareness: 0.20, physical: 0.25, mentality: 0.15 },
};

export const calculateOverall = (position: PositionFamily, attributes: PlayerAttributes): number => {
  const current = weights[position];
  const value = Object.entries(current).reduce(
    (sum, [key, weight]) => sum + attributes[key as keyof PlayerAttributes] * weight,
    0,
  );
  return Math.round(value);
};
