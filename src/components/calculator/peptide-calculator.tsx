"use client";

import { useMemo, useState } from "react";
import {
  Beaker,
  Copy,
  Droplets,
  FlaskConical,
  HelpCircle,
  RotateCcw,
  Syringe,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  buildCalculatorSummary,
  calculatePeptideReconstitution,
  formatCalculatorNumber,
  type SyringeScale,
  type TargetUnit,
} from "@/lib/peptide-calculator";

function FieldTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label="More information"
      >
        <HelpCircle className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function FieldLabel({
  label,
  tooltip,
}: {
  label: string;
  tooltip?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {tooltip ? <FieldTooltip text={tooltip} /> : null}
    </span>
  );
}

function ResultMetric({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        highlight
          ? "border-accent/30 bg-accent/5"
          : "border-border bg-muted/30"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold text-navy-deep">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}

const DEFAULTS = {
  vialQuantityMg: "5",
  diluentVolumeMl: "2",
  targetQuantity: "250",
  targetUnit: "mcg" as TargetUnit,
  syringeScale: "u100" as SyringeScale,
};

export function PeptideCalculator() {
  const { toast } = useToast();
  const [vialQuantityMg, setVialQuantityMg] = useState(DEFAULTS.vialQuantityMg);
  const [diluentVolumeMl, setDiluentVolumeMl] = useState(DEFAULTS.diluentVolumeMl);
  const [targetQuantity, setTargetQuantity] = useState(DEFAULTS.targetQuantity);
  const [targetUnit, setTargetUnit] = useState<TargetUnit>(DEFAULTS.targetUnit);
  const [syringeScale, setSyringeScale] = useState<SyringeScale>(
    DEFAULTS.syringeScale
  );

  const parsedInput = useMemo(
    () => ({
      vialQuantityMg: parseFloat(vialQuantityMg),
      diluentVolumeMl: parseFloat(diluentVolumeMl),
      targetQuantity: parseFloat(targetQuantity),
      targetUnit,
      syringeScale,
    }),
    [vialQuantityMg, diluentVolumeMl, targetQuantity, targetUnit, syringeScale]
  );

  const result = useMemo(
    () => calculatePeptideReconstitution(parsedInput),
    [parsedInput]
  );

  function handleReset() {
    setVialQuantityMg(DEFAULTS.vialQuantityMg);
    setDiluentVolumeMl(DEFAULTS.diluentVolumeMl);
    setTargetQuantity(DEFAULTS.targetQuantity);
    setTargetUnit(DEFAULTS.targetUnit);
    setSyringeScale(DEFAULTS.syringeScale);
  }

  async function handleCopy() {
    const summary = buildCalculatorSummary(parsedInput, result);
    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: "Results copied",
        description: "Calculation summary copied to clipboard.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to access clipboard. Please copy manually.",
        variant: "error",
      });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/10 text-navy">
              <FlaskConical className="size-5" />
            </div>
            <div>
              <CardTitle>Reconstitution Parameters</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter vial and diluent values for your laboratory protocol.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <Input
            label={
              <FieldLabel
                label="Vial quantity (mg)"
                tooltip="Total peptide mass in the lyophilized vial before reconstitution."
              />
            }
            type="number"
            min="0"
            step="any"
            value={vialQuantityMg}
            onChange={(e) => setVialQuantityMg(e.target.value)}
            hint="Mass of peptide compound in the vial"
          />

          <Input
            label={
              <FieldLabel
                label="Diluent volume (mL)"
                tooltip="Volume of bacteriostatic water or research diluent added to the vial."
              />
            }
            type="number"
            min="0"
            step="any"
            value={diluentVolumeMl}
            onChange={(e) => setDiluentVolumeMl(e.target.value)}
            hint="Total diluent added during reconstitution"
          />

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Input
              label={
                <FieldLabel
                  label="Target quantity"
                  tooltip="Desired amount of peptide compound for your research preparation — not a dosing recommendation."
                />
              }
              type="number"
              min="0"
              step="any"
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(e.target.value)}
            />
            <Select
              label="Unit"
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value as TargetUnit)}
              className="sm:w-28"
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
            </Select>
          </div>

          <Select
            label={
              <FieldLabel
                label="Syringe scale (optional)"
                tooltip="U-100 syringes mark 100 units per 1 mL. Select none if you only need volume."
              />
            }
            value={syringeScale}
            onChange={(e) => setSyringeScale(e.target.value as SyringeScale)}
            hint="Used to convert volume to syringe graduations"
          >
            <option value="none">None — volume only</option>
            <option value="u100">U-100 (100 units/mL)</option>
            <option value="u50">U-50 (50 units/mL)</option>
            <option value="u30">U-30 (30 units/mL)</option>
          </Select>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopy}
              disabled={!result.isValid}
            >
              <Copy className="size-4" />
              Copy results
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 text-teal">
                <Beaker className="size-5" />
              </div>
              <div>
                <CardTitle>Calculated Results</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Live output based on your inputs.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!result.isValid ? (
              <div className="rounded-lg border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-foreground">
                <p className="font-medium text-navy-deep">Enter valid values</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultMetric
                  label="Concentration"
                  value={formatCalculatorNumber(result.concentrationMgMl!)}
                  unit="mg/mL"
                />
                <ResultMetric
                  label="Concentration"
                  value={formatCalculatorNumber(result.concentrationMcgMl!)}
                  unit="mcg/mL"
                />
                <ResultMetric
                  label="Volume needed"
                  value={formatCalculatorNumber(result.volumeNeededMl!)}
                  unit="mL"
                  highlight
                />
                {result.syringeUnits !== null ? (
                  <ResultMetric
                    label="Syringe units"
                    value={formatCalculatorNumber(result.syringeUnits, 1)}
                    unit="units"
                    highlight
                  />
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formula reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <Droplets className="mt-0.5 size-4 shrink-0 text-accent" />
              <p>
                <span className="font-mono text-foreground">
                  concentration (mg/mL) = vial quantity (mg) ÷ diluent volume (mL)
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <Target className="mt-0.5 size-4 shrink-0 text-accent" />
              <p>
                <span className="font-mono text-foreground">
                  volume needed (mL) = target (mg) ÷ concentration (mg/mL)
                </span>
                <span className="mt-1 block">
                  Target in mcg is converted: mcg ÷ 1000 = mg
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <Syringe className="mt-0.5 size-4 shrink-0 text-accent" />
              <p>
                <span className="font-mono text-foreground">
                  syringe units = volume (mL) × units per mL
                </span>
                <span className="mt-1 block">
                  U-100: 100 units per 1 mL · U-50: 50 units per 1 mL
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-burgundy/20 bg-burgundy/5 px-5 py-4">
          <p className="text-sm font-semibold text-burgundy">Research use only</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This calculator is a laboratory research utility for reconstitution
            mathematics. It does not provide medical advice, human dosing
            recommendations, or instructions for administration. Products from
            OVIpeps are intended for qualified laboratory research only.
          </p>
        </div>
      </div>
    </div>
  );
}
