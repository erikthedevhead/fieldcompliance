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
    }
    setError(null);
  }, [open, equipment]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload: CreateEquipmentInput = {
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
      if (category === "STORAGE_TANK" && tankCapacityBbls) {
        payload.tankCapacityBbls = Number(tankCapacityBbls);
      }
      if (
        (category === "COMPRESSOR_RECIPROCATING" ||
          category === "COMPRESSOR_CENTRIFUGAL") &&
        compressorHp
      ) {
        payload.compressorHp = Number(compressorHp);
      }
      if (throughputMcfd) {
        payload.throughputMcfd = Number(throughputMcfd);
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
                hint="Determines the AP-42 emission factor"
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
    </Sheet>
  );
}
