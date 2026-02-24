export type UnitSystem = "imperial" | "metric";

export const DEFAULT_UNIT_SYSTEM: UnitSystem = "imperial";

function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

export function parseUnitSystem(value: unknown): UnitSystem {
  return value === "metric" ? "metric" : DEFAULT_UNIT_SYSTEM;
}

export function readUnitSystemFromProfile(profile: Record<string, unknown> | null | undefined): UnitSystem {
  if (!profile || typeof profile !== "object") return DEFAULT_UNIT_SYSTEM;
  const devices = profile.devices;
  if (!devices || typeof devices !== "object") return DEFAULT_UNIT_SYSTEM;
  return parseUnitSystem((devices as Record<string, unknown>).units_system);
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function kgToLbs(kg: number): number {
  return kg * 2.2046226218;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.2046226218;
}

export function fromDisplayHeight(heightValue: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? inchesToCm(heightValue) : heightValue;
}

export function toDisplayHeight(heightCm: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? cmToInches(heightCm) : heightCm;
}

export function fromDisplayWeight(weightValue: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? lbsToKg(weightValue) : weightValue;
}

export function toDisplayWeight(weightKg: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? kgToLbs(weightKg) : weightKg;
}

export function fromDisplayLength(lengthValue: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? inchesToCm(lengthValue) : lengthValue;
}

export function toDisplayLength(lengthCm: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? cmToInches(lengthCm) : lengthCm;
}

export function formatDisplayNumber(value: number, decimals = 1): string {
  const rounded = roundTo(value, decimals);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals).replace(/\.?0+$/, "");
}

export function heightUnitLabel(unitSystem: UnitSystem): "in" | "cm" {
  return unitSystem === "imperial" ? "in" : "cm";
}

export function weightUnitLabel(unitSystem: UnitSystem): "lb" | "kg" {
  return unitSystem === "imperial" ? "lb" : "kg";
}
