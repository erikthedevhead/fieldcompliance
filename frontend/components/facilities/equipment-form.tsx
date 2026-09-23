"use client";

import { useState, useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import {
  equipmentApi,
  EQUIPMENT_CATEGORIES,
  type Equipment,
  type EquipmentCategory,
  type CreateEquipmentInput,
} from "@/lib/api-client";
import { FieldGroup, Field } from "./facility-form";

/**
 * Converts a form text value to a number for the payload, or null when
 * the field is genuinely empty. Never returns 0 for an empty string --
 * Number('') === 0 in JS, which previously caused clearing a field to
 * silently persist as a real zero value instead of clearing it.
 */
function numOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

interface EquipmentFormProps {
  open: boolean;
  facilityId: string;
  equipment?: Equipment | null;
  onClose: () => void;
  onSaved?: (equipment: Equipment) => void;
}

export function EquipmentForm({
  open,
  facilityId,
  equipment,
  onClose,
  onSaved,
}: EquipmentFormProps) {
  const isEdit = !!equipment;

  const [tag, setTag] = useState("");
  const [category, setCategory] = useState<EquipmentCategory>(
    "PNEUMATIC_CONTROLLER",
  );
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [installDate, setInstallDate] = useState("");

  // Category-specific
  const [pneumaticType, setPneumaticType] = useState<
    "CONTINUOUS_HIGH_BLEED" | "CONTINUOUS_LOW_BLEED" | "INTERMITTENT_BLEED"
  >("CONTINUOUS_LOW_BLEED");
  const [tankCapacityBbls, setTankCapacityBbls] = useState("");
  const [compressorHp, setCompressorHp] = useState("");
  const [throughputMcfd, setThroughputMcfd] = useState("");

  // Subpart W — compressor rod packing (Eq. W-29E)
  const [operatingHours, setOperatingHours] = useState("");
  const [ventedToAtmosphere, setVentedToAtmosphere] = useState(true);
  const [isOOOOb, setIsOOOOb] = useState(false);
  // Subpart W — tank Method 3 (Eq. W-15A / W-15B), on the FEEDING unit
  const [feedsAtmosphericTank, setFeedsAtmosphericTank] = useState(false);
  const [liquidType, setLiquidType] = useState<"CRUDE_OIL" | "GAS_CONDENSATE">("CRUDE_OIL");
  const [dailyThroughputBbl, setDailyThroughputBbl] = useState("");
  const [producedWaterBblPerYear, setProducedWaterBblPerYear] = useState("");
  const [feedPressurePsig, setFeedPressurePsig] = useState("");
  const [routesToVruOrFlare, setRoutesToVruOrFlare] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (equipment) {
      setTag(equipment.tag);
      setCategory(equipment.category);
      setDescription(equipment.description ?? "");
      setManufacturer(equipment.manufacturer ?? "");
      setModel(equipment.model ?? "");
      setSerialNumber(equipment.serialNumber ?? "");
      setInstallDate(
        equipment.installDate ? equipment.installDate.slice(0, 10) : "",
      );
      setPneumaticType(
        (equipment.pneumaticType as
          | "CONTINUOUS_HIGH_BLEED"
          | "CONTINUOUS_LOW_BLEED"
          | "INTERMITTENT_BLEED") ?? "CONTINUOUS_LOW_BLEED",
      );
      setTankCapacityBbls(
        equipment.tankCapacityBbls != null
          ? String(equipment.tankCapacityBbls)
          : "",
      );
      setCompressorHp(
        equipment.compressorHp != null ? String(equipment.compressorHp) : "",
      );
      setThroughputMcfd(
        equipment.throughputMcfd != null
          ? String(equipment.throughputMcfd)
          : "",
      );
      setOperatingHours(
        equipment.operatingHours != null ? String(equipment.operatingHours) : "",
      );
      setVentedToAtmosphere(equipment.ventedToAtmosphere !== false);
      setIsOOOOb(!!equipment.isSubjectToOOOObCompressorStandards);
      setFeedsAtmosphericTank(!!equipment.feedsAtmosphericTank);
      setLiquidType((equipment.liquidType as "CRUDE_OIL" | "GAS_CONDENSATE") ?? "CRUDE_OIL");
      setDailyThroughputBbl(
        equipment.dailyThroughputBbl != null ? String(equipment.dailyThroughputBbl) : "",
      );
      setProducedWaterBblPerYear(
        equipment.producedWaterBblPerYear != null
          ? String(equipment.producedWaterBblPerYear)
          : "",
      );
      setFeedPressurePsig(
        equipment.feedPressurePsig != null ? String(equipment.feedPressurePsig) : "",
      );
      setRoutesToVruOrFlare(!!equipment.routesToVruOrFlare);
    } else {
      setTag("");
      setCategory("PNEUMATIC_CONTROLLER");
      setDescription("");
      setManufacturer("");
      setModel("");
      setSerialNumber("");
      setInstallDate("");
      setPneumaticType("CONTINUOUS_LOW_BLEED");
      setTankCapacityBbls("");
      setCompressorHp("");
      setThroughputMcfd("");
      setOperatingHours("");
      setVentedToAtmosphere(true);
      setIsOOOOb(false);
      setFeedsAtmosphericTank(false);
      setLiquidType("CRUDE_OIL");
      setDailyThroughputBbl("");
      setProducedWaterBblPerYear("");
      setFeedPressurePsig("");
      setRoutesToVruOrFlare(false);
    }
    setError(null);
  }, [open, equipment]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload: any = {
        facilityId,
        tag: tag.trim(),
        category,
        description: description.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        installDate: installDate || undefined,
      };
      // Category-conditional fields
      if (
        category === "PNEUMATIC_CONTROLLER" ||
        category === "PNEUMATIC_PUMP"
      ) {
        payload.pneumaticType = pneumaticType;
      }
      if (category === "STORAGE_TANK") {
        payload.tankCapacityBbls = numOrNull(tankCapacityBbls);
      }
      if (
        (category === "COMPRESSOR_RECIPROCATING" ||
          category === "COMPRESSOR_CENTRIFUGAL") &&
        true
      ) {
        payload.compressorHp = numOrNull(compressorHp);
      }
      payload.throughputMcfd = numOrNull(throughputMcfd);
      if (category === "COMPRESSOR_RECIPROCATING") {
        payload.operatingHours = numOrNull(operatingHours);
        payload.ventedToAtmosphere = ventedToAtmosphere;
        payload.isSubjectToOOOObCompressorStandards = isOOOOb;
      }
      if (category === "STORAGE_TANK") {
        payload.routesToVruOrFlare = routesToVruOrFlare;
      }
      payload.feedsAtmosphericTank = feedsAtmosphericTank;
      if (feedsAtmosphericTank) {
        payload.liquidType = liquidType;
        payload.dailyThroughputBbl = numOrNull(dailyThroughputBbl);
        payload.producedWaterBblPerYear = numOrNull(producedWaterBblPerYear);
        payload.feedPressurePsig = numOrNull(feedPressurePsig);
      }

      let saved;
      if (isEdit) {
        const { facilityId: _f, category: _c, ...updatePayload } = payload;
        saved = await equipmentApi.update(equipment!.id, updatePayload);
      } else {
        saved = await equipmentApi.create(payload);
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    if (!equipment) return;
    if (
      !window.confirm(
        `Remove ${equipment.tag}? Emission history is preserved for audit but the tag will no longer appear in active views.`,
      )
    ) {
      return;
    }
    setIsRemoving(true);
    setError(null);
    try {
      const removed = await equipmentApi.remove(equipment.id);
      onSaved?.(removed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setIsRemoving(false);
    }
  }

  const isPneumatic =
    category === "PNEUMATIC_CONTROLLER" || category === "PNEUMATIC_PUMP";
  const isTank = category === "STORAGE_TANK";
  const isCompressor =
    category === "COMPRESSOR_RECIPROCATING" ||
    category === "COMPRESSOR_CENTRIFUGAL";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit equipment" : "Add equipment"}
      subtitle={
        isEdit ? equipment?.tag : "Tag a new asset for compliance tracking"
      }
      footer={
        <div className="flex justify-between items-center">
          {isEdit ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isRemoving || isSaving}
              className="text-[12px] text-overdue hover:underline disabled:opacity-50 focus-ring rounded"
            >
              {isRemoving ? "Removing…" : "Remove"}
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add equipment"}
            </Button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="rounded border border-overdue/30 bg-overdue-bg px-3 py-2 text-[13px] text-overdue mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <FieldGroup label="Identity">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Tag" required>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                placeholder="PC-101"
                required
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Category" required>
              <Select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as EquipmentCategory)
                }
                disabled={isEdit}
              >
                {EQUIPMENT_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-bleed level controller — separator"
              rows={2}
            />
          </Field>
        </FieldGroup>

        <FieldGroup label="Nameplate">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Manufacturer">
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Fisher"
              />
            </Field>
            <Field label="Model">
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="L2"
              />
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Field label="Serial number">
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Installed">
              <Input
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>

        {(isPneumatic || isTank || isCompressor) && (
          <FieldGroup label="Emissions attributes">
            {isPneumatic && (
              <Field
                label="Pneumatic type"
                hint="Selects the Table W-1 factor (Eq. W-1B). Required — the calculator never guesses."
              >
                <Select
                  value={pneumaticType}
                  onChange={(e) =>
                    setPneumaticType(
                      e.target.value as
                        | "CONTINUOUS_HIGH_BLEED"
                        | "CONTINUOUS_LOW_BLEED"
                        | "INTERMITTENT_BLEED",
                    )
                  }
                >
                  <option value="CONTINUOUS_HIGH_BLEED">
                    Continuous high-bleed (&gt;6 scf/hr)
                  </option>
                  <option value="INTERMITTENT_BLEED">Intermittent bleed</option>
                  <option value="CONTINUOUS_LOW_BLEED">
                    Continuous low-bleed (≤6 scf/hr)
                  </option>
                </Select>
              </Field>
            )}
            {isTank && (
              <Field label="Tank capacity (bbl)">
                <Input
                  type="number"
                  step="1"
                  value={tankCapacityBbls}
                  onChange={(e) => setTankCapacityBbls(e.target.value)}
                  placeholder="400"
                  className="font-mono"
                />
              </Field>
            )}
            {isCompressor && (
              <Field label="Rated HP">
                <Input
                  type="number"
                  step="1"
                  value={compressorHp}
                  onChange={(e) => setCompressorHp(e.target.value)}
                  placeholder="500"
                  className="font-mono"
                />
              </Field>
            )}
            <Field
              label="Throughput (mcf/day)"
              hint="Optional — used for capacity checks"
            >
              <Input
                type="number"
                step="any"
                value={throughputMcfd}
                onChange={(e) => setThroughputMcfd(e.target.value)}
                className="font-mono"
              />
            </Field>
          </FieldGroup>
        )}
      </form>

      <div className="space-y-5 mt-5">
        {isCompressor && category === "COMPRESSOR_RECIPROCATING" && (
          <FieldGroup label="Rod packing — 40 CFR 98.233(p)">
            <Field
              label="Operating-mode hours"
              hint="Hours in OPERATING mode this year. Standby-pressurized time does not count toward Eq. W-29E."
            >
              <Input
                type="number"
                step="1"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="8760"
                className="font-mono"
              />
            </Field>
            <label className="flex items-start gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={ventedToAtmosphere}
                onChange={(e) => setVentedToAtmosphere(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Vents directly to atmosphere
                <span className="block text-[12px] text-ink-muted">
                  Uncheck if rod packing routes to a flare, combustion, or vapor recovery
                  system — §98.233(p) then does not require it.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={isOOOOb}
                onChange={(e) => setIsOOOOb(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Subject to OOOOb §60.5385b
                <span className="block text-[12px] text-ink-muted">
                  If checked, emissions must be MEASURED on the §60.5385b schedule. The
                  factor method is not permitted and this compressor will be skipped.
                </span>
              </span>
            </label>
          </FieldGroup>
        )}

        {isTank && (
          <FieldGroup label="Tank controls — 40 CFR 98.233(j)(4)">
            <label className="flex items-start gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={routesToVruOrFlare}
                onChange={(e) => setRoutesToVruOrFlare(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Routes to a vapor recovery system or flare
                <span className="block text-[12px] text-ink-muted">
                  Requires hours-based apportionment (an open thief hatch means 0% capture).
                  Not yet supported — such tanks are omitted from the calculation.
                </span>
              </span>
            </label>
          </FieldGroup>
        )}

        <FieldGroup label="Feeds an atmospheric tank — 40 CFR 98.233(j)(3)">
          <label className="flex items-start gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={feedsAtmosphericTank}
              onChange={(e) => setFeedsAtmosphericTank(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              This unit feeds liquids or produced water directly to an atmospheric tank
              <span className="block text-[12px] text-ink-muted">
                Eq. W-15A counts feeding units — separators, wells, non-separator equipment —
                not the tanks themselves.
              </span>
            </span>
          </label>

          {feedsAtmosphericTank && (
            <>
              <Field label="Liquid type">
                <Select
                  value={liquidType}
                  onChange={(e) =>
                    setLiquidType(e.target.value as "CRUDE_OIL" | "GAS_CONDENSATE")
                  }
                >
                  <option value="CRUDE_OIL">Crude oil (4.2 Mscf CH₄/yr)</option>
                  <option value="GAS_CONDENSATE">Gas condensate (17.6 Mscf CH₄/yr)</option>
                </Select>
              </Field>
              <Field
                label="Throughput (bbl/day)"
                hint="Annual average. Method 3 applies only below 10 bbl/day; at or above that, Method 1 or 2 is required and this unit is skipped."
              >
                <Input
                  type="number"
                  step="any"
                  value={dailyThroughputBbl}
                  onChange={(e) => setDailyThroughputBbl(e.target.value)}
                  placeholder="6"
                  className="font-mono"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Produced water (bbl/yr)">
                  <Input
                    type="number"
                    step="any"
                    value={producedWaterBblPerYear}
                    onChange={(e) => setProducedWaterBblPerYear(e.target.value)}
                    placeholder="10000"
                    className="font-mono"
                  />
                </Field>
                <Field
                  label="Feed pressure (psig)"
                  hint="Sets the W-15B tier — a 33.9× swing"
                >
                  <Input
                    type="number"
                    step="any"
                    value={feedPressurePsig}
                    onChange={(e) => setFeedPressurePsig(e.target.value)}
                    placeholder="120"
                    className="font-mono"
                  />
                </Field>
              </div>
            </>
          )}
        </FieldGroup>
      </div>
    </Sheet>
  );
}
