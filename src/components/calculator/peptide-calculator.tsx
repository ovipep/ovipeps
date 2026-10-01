"use client";

import { useMemo, useState } from "react";
import {
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

const SYRINGE_SIZES = [
  { label: "0.3 mL", units: 30 },
  { label: "0.5 mL", units: 50 },
  { label: "1.0 mL", units: 100 },
] as const;

export function PeptideCalculator() {
  const { toast } = useToast();
  const [vialQuantityMg, setVialQuantityMg] = useState(DEFAULTS.vialQuantityMg);
  const [diluentVolumeMl, setDiluentVolumeMl] = useState(DEFAULTS.diluentVolumeMl);
  const [targetQuantity, setTargetQuantity] = useState(DEFAULTS.targetQuantity);
  const [targetUnit, setTargetUnit] = useState<TargetUnit>(DEFAULTS.targetUnit);
  const [syringeScale, setSyringeScale] = useState<SyringeScale>(
    DEFAULTS.syringeScale
  );
  const [syringeCapacity, setSyringeCapacity] = useState(100);

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
    setSyringeCapacity(100);
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
    <div className="overflow-hidden rounded-3xl border border-sky/15 bg-card shadow-2xl shadow-navy/10 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <div className="overflow-hidden">
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

          <fieldset>
            <legend className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
              Syringe size
              <FieldTooltip text="Select the capacity printed on your U-100 insulin syringe." />
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {SYRINGE_SIZES.map((option) => (
                <button
                  key={option.units}
                  type="button"
                  onClick={() => {
                    setSyringeCapacity(option.units);
                    setSyringeScale("u100");
                  }}
                  className={cn(
                    "rounded-xl border px-2 py-3 text-center transition-all",
                    syringeCapacity === option.units
                      ? "border-sky bg-sky/10 text-navy-deep shadow-sm ring-1 ring-sky/20"
                      : "border-border bg-card text-muted-foreground hover:border-sky/40"
                  )}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-0.5 block text-xs">{option.units} units</span>
                </button>
              ))}
            </div>
          </fieldset>

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
      </div>

      <div className="bg-gradient-to-br from-navy-deep via-navy to-sky p-6 text-white sm:p-8 lg:p-10">
        <div className="flex h-full flex-col justify-center">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-bright">Draw to</p>
            {!result.isValid ? (
              <div className="mt-6 rounded-xl border border-white/15 bg-white/10 px-4 py-4 text-sm text-white">
                <p className="font-semibold">Enter valid values</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <p className="mt-2 text-6xl font-bold tracking-tight sm:text-7xl">
                  {formatCalculatorNumber(result.syringeUnits!, 1)}
                  <span className="ml-2 text-base font-medium tracking-normal text-white/60">units</span>
                </p>
                <div className="mx-auto mt-8 flex w-full max-w-md items-center" aria-label={`Syringe filled to ${Math.min(100, (result.syringeUnits! / syringeCapacity) * 100).toFixed(0)} percent`}>
                  <div className="h-12 w-6 rounded-l border-2 border-r-0 border-white/60" />
                  <div className="relative h-10 flex-1 overflow-hidden rounded border-2 border-white/60 bg-white/10">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan to-cyan-bright transition-all duration-300" style={{ width: `${Math.min(100, (result.syringeUnits! / syringeCapacity) * 100)}%` }} />
                    <div className="absolute inset-0 flex justify-around">{Array.from({ length: 21 }, (_, index) => <span key={index} className={cn("w-px bg-white/60", index % 5 === 0 ? "h-4" : "h-2.5")} />)}</div>
                  </div>
                  <div className="h-0.5 w-12 bg-white/60" />
                </div>
                {result.syringeUnits! > syringeCapacity ? <div className="mt-6 rounded-xl bg-amber-100 px-4 py-3 text-left text-sm font-semibold text-amber-950">This amount exceeds the selected syringe capacity. Recheck every entry.</div> : null}
                <div className="mt-8 grid grid-cols-2 divide-x divide-white/15 border-y border-white/15 py-4 text-sm">
                  <div><span className="block text-xs text-white/55">Volume</span><strong className="mt-1 block">{formatCalculatorNumber(result.volumeNeededMl!)} mL</strong></div>
                  <div><span className="block text-xs text-white/55">Concentration</span><strong className="mt-1 block">{formatCalculatorNumber(result.concentrationMgMl!)} mg/mL</strong></div>
                </div>
                <div className="mt-5 rounded-xl border border-white/15 bg-white/10 px-4 py-4" aria-live="polite">
                  <p className="text-sm text-white/70">Full doses per vial</p>
                  <p className="mt-1 text-3xl font-bold">{result.fullDoses}</p>
                  <p className="mt-1 text-sm text-white/70">At {targetQuantity} {targetUnit} per dose</p>
                  {result.remainingQuantityMg! > parsedInput.vialQuantityMg * Number.EPSILON * 4 ? (
                    <p className="mt-2 text-sm text-white/70">Left over: {formatCalculatorNumber(result.remainingQuantityMg! * 1000, 6)} mcg — less than one full dose.</p>
                  ) : null}
                </div>
                <p className="mt-5 text-xs text-white/50">Your entries stay in your browser.</p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-6 border-t border-border p-6 lg:col-span-2 lg:p-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {result.isValid ? <>
            <ResultMetric label="Concentration" value={formatCalculatorNumber(result.concentrationMgMl!)} unit="mg/mL" />
            <ResultMetric label="Concentration" value={formatCalculatorNumber(result.concentrationMcgMl!)} unit="mcg/mL" />
            <ResultMetric label="Volume needed" value={formatCalculatorNumber(result.volumeNeededMl!)} unit="mL" highlight />
            <ResultMetric label="Syringe units" value={formatCalculatorNumber(result.syringeUnits!, 1)} unit="units" highlight />
          </> : null}
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Formula reference</CardTitle></CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
            <div className="flex gap-3"><Droplets className="mt-0.5 size-4 shrink-0 text-accent" /><p><span className="font-mono text-foreground">concentration = vial quantity ÷ diluent volume</span></p></div>
            <div className="flex gap-3"><Target className="mt-0.5 size-4 shrink-0 text-accent" /><p><span className="font-mono text-foreground">volume = target ÷ concentration</span><span className="mt-1 block">mcg ÷ 1000 = mg</span></p></div>
            <div className="flex gap-3"><Syringe className="mt-0.5 size-4 shrink-0 text-accent" /><p><span className="font-mono text-foreground">units = volume × 100</span><span className="mt-1 block">For U-100 insulin syringes</span></p></div>
          </CardContent>
        </Card>
        <div className="rounded-xl border border-burgundy/20 bg-burgundy/5 px-5 py-4">
          <p className="text-sm font-semibold text-burgundy">Research use only</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This calculator performs unit conversion using the values you enter. It
            does not provide medical advice, dosing recommendations, treatment
            schedules, or administration instructions. Independently verify all inputs
            and results with a qualified professional. OVIpeps products are intended
            for qualified laboratory research only. For
            another laboratory calculation tool, visit{" "}
            <a href="https://thepeptidelabs.ca/dosage-calculator/" target="_blank" rel="noopener noreferrer" className="font-semibold text-sky hover:underline">
              The Peptide Labs calculator
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
