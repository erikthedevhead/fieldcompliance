"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProvenanceChain, type ProvenanceStep } from "./provenance-chain";
import { deadlinesApi, type Deadline } from "@/lib/api-client";
import { formatDueDate } from "@/lib/utils";

/**
 * Full deadline record with the joined regulation and version.
 * Matches what `GET /deadlines/:id` returns.
 */
interface DeadlineDetail extends Omit<Deadline, "facility"> {
  facility: {
    id: string;
    name: string;
    state: string;
    county?: string | null;
  };
  regulationVersion: {
    id: string;
    version: string;
    effectiveDate: string;
    regulation: {
      code: string;
      title: string;
      cfrPart: string | null;
      federalRegisterUrl: string | null;
    };
  };
  notes?: string | null;
}

interface DeadlineDetailPanelProps {
  deadlineId: string | null;
  onClose: () => void;
  onCompleted?: () => void;
}

export function DeadlineDetailPanel({
  deadlineId,
  onClose,
  onCompleted,
}: DeadlineDetailPanelProps) {
  const [detail, setDetail] = useState<DeadlineDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deadlineId) {
      setDetail(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    deadlinesApi
      .get(deadlineId)
      .then((d) => setDetail(d as DeadlineDetail))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setIsLoading(false));
  }, [deadlineId]);

  async function handleComplete() {
    if (!detail) return;
    setIsCompleting(true);
    try {
      await deadlinesApi.complete(detail.id);
      onCompleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete");
    } finally {
      setIsCompleting(false);
    }
  }

  const provenance = detail ? buildProvenance(detail) : [];

  return (
    <Sheet
      open={!!deadlineId}
      onClose={onClose}
      title={detail?.title ?? (isLoading ? "Loading…" : "Deadline")}
      subtitle={detail?.ruleCode ?? ""}
      footer={
        detail && detail.status !== "COMPLETED" ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Completing…" : "Mark complete"}
            </Button>
          </div>
        ) : detail ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null
      }
    >
      {error && (
        <div className="rounded border border-overdue/30 bg-overdue-bg px-3 py-2 text-[13px] text-overdue mb-4">
          {error}
        </div>
      )}

      {isLoading && <SheetSkeleton />}

      {detail && !isLoading && (
        <div className="space-y-5">
          <FactGrid detail={detail} />

          {detail.description && (
            <div>
              <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide mb-1.5">
                Description
              </div>
              <p className="text-[13px] text-ink leading-relaxed">
                {detail.description}
              </p>
            </div>
          )}

          <ProvenanceChain steps={provenance} heading="Regulatory authority" />

          {detail.regulationVersion.regulation.federalRegisterUrl && (
            <a
              href={detail.regulationVersion.regulation.federalRegisterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-info hover:underline inline-flex items-center gap-1"
            >
              Read source rule ↗
            </a>
          )}
        </div>
      )}
    </Sheet>
  );
}

function FactGrid({ detail }: { detail: DeadlineDetail }) {
  const facts: Array<[string, string, boolean?]> = [
    ["Status", detail.status.replace("_", " ")],
    ["Due", formatDueDate(detail.dueDate)],
    ["Facility", `${detail.facility.name} · ${detail.facility.state}`],
    [
      "Assignee",
      detail.assignedUser
        ? `${detail.assignedUser.firstName} ${detail.assignedUser.lastName}`
        : "Unassigned",
    ],
  ];

  const statusTone = {
    OVERDUE: "text-overdue",
    PENDING: "text-warn",
    IN_PROGRESS: "text-info",
    COMPLETED: "text-ok",
    WAIVED: "text-ink-muted",
  }[detail.status];

  return (
    <div className="grid grid-cols-2 gap-4">
      {facts.map(([label, value], i) => (
        <div key={label} className="min-w-0">
          <div className="reg-code text-ink-muted text-[10px] uppercase tracking-wide">
            {label}
          </div>
          <div
            className={`text-[13px] mt-1 truncate ${i === 0 ? `${statusTone} font-medium` : "text-ink"}`}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="h-2.5 w-16 rounded bg-hairline animate-pulse mb-2" />
            <div className="h-3.5 w-24 rounded bg-hairline animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-48 rounded-card bg-ink/5 animate-pulse" />
    </div>
  );
}

function buildProvenance(detail: DeadlineDetail): ProvenanceStep[] {
  const reg = detail.regulationVersion.regulation;
  return [
    {
      label: "Code of Federal Regulations",
      value: reg.cfrPart ?? reg.code,
      note: reg.title,
    },
    {
      label: "Regulation version",
      value: detail.regulationVersion.version,
      note: `Effective ${new Date(detail.regulationVersion.effectiveDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    },
    {
      label: "Rule",
      value: detail.ruleCode,
      note: detail.title,
    },
    {
      label: "Obligation",
      value: `Due ${new Date(detail.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      note: `${detail.facility.name} · ${detail.facility.state}`,
      emphasis: true,
    },
  ];
}
