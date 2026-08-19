export type TargetUnit = "mcg" | "mg";

export type SyringeScale = "none" | "u100" | "u50" | "u30";

export interface PeptideCalculatorInput {
  vialQuantityMg: number;
  diluentVolumeMl: number;
  targetQuantity: number;
  targetUnit: TargetUnit;
  syringeScale: SyringeScale;
}

export interface PeptideCalculatorResult {
  isValid: boolean;
  errors: string[];
  concentrationMgMl: number | null;
  concentrationMcgMl: number | null;
  targetMg: number | null;
  volumeNeededMl: number | null;
  syringeUnits: number | null;
  syringeUnitsPerMl: number | null;
}

const SYRINGE_UNITS_PER_ML: Record<Exclude<SyringeScale, "none">, number> = {
  u100: 100,
  u50: 50,
  u30: 30,
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function convertTargetToMg(quantity: number, unit: TargetUnit): number {
  return unit === "mcg" ? quantity / 1000 : quantity;
}

export function getSyringeUnitsPerMl(scale: SyringeScale): number | null {
  if (scale === "none") return null;
  return SYRINGE_UNITS_PER_ML[scale];
}

export function calculatePeptideReconstitution(
  input: PeptideCalculatorInput
): PeptideCalculatorResult {
  const errors: string[] = [];

  if (!isPositiveFinite(input.vialQuantityMg)) {
    errors.push("Vial quantity must be a positive number (mg).");
  }
  if (!isPositiveFinite(input.diluentVolumeMl)) {
    errors.push("Diluent volume must be a positive number (mL).");
  }
  if (!isPositiveFinite(input.targetQuantity)) {
    errors.push("Target quantity must be a positive number.");
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      concentrationMgMl: null,
      concentrationMcgMl: null,
      targetMg: null,
      volumeNeededMl: null,
      syringeUnits: null,
      syringeUnitsPerMl: getSyringeUnitsPerMl(input.syringeScale),
    };
  }

  const concentrationMgMl = input.vialQuantityMg / input.diluentVolumeMl;
  const concentrationMcgMl = concentrationMgMl * 1000;
  const targetMg = convertTargetToMg(input.targetQuantity, input.targetUnit);
  const volumeNeededMl = targetMg / concentrationMgMl;

  const unitsPerMl = getSyringeUnitsPerMl(input.syringeScale);
  const syringeUnits =
    unitsPerMl !== null ? volumeNeededMl * unitsPerMl : null;

  return {
    isValid: true,
    errors: [],
    concentrationMgMl,
    concentrationMcgMl,
    targetMg,
    volumeNeededMl,
    syringeUnits,
    syringeUnitsPerMl: unitsPerMl,
  };
}

export function formatCalculatorNumber(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(decimals));
  return rounded.toString();
}

export function buildCalculatorSummary(
  input: PeptideCalculatorInput,
  result: PeptideCalculatorResult
): string {
  if (!result.isValid) {
    return "OVIpeps Reconstitution Calculator — incomplete inputs";
  }

  const lines = [
    "OVIpeps Reconstitution Calculator",
    "For laboratory research use only — not medical advice.",
    "",
    `Vial quantity: ${input.vialQuantityMg} mg`,
    `Diluent volume: ${input.diluentVolumeMl} mL`,
    `Target quantity: ${input.targetQuantity} ${input.targetUnit}`,
    "",
    `Concentration: ${formatCalculatorNumber(result.concentrationMgMl!)} mg/mL`,
    `Concentration: ${formatCalculatorNumber(result.concentrationMcgMl!)} mcg/mL`,
    `Volume needed: ${formatCalculatorNumber(result.volumeNeededMl!)} mL`,
  ];

  if (result.syringeUnits !== null && result.syringeUnitsPerMl !== null) {
    lines.push(
      `Syringe units (${result.syringeUnitsPerMl} units/mL): ${formatCalculatorNumber(result.syringeUnits, 1)}`
    );
  }

  return lines.join("\n");
}
