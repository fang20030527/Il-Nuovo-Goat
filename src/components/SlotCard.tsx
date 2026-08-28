"use client";

import Link from "next/link";
import { useRef } from "react";
import type { CareerSlot, SlotSummary } from "@/persistence/career-db";
import { commitSlot, deleteSlot, loadSlot, restoreSlotBackup } from "@/persistence/career-db";
import { exportCareer, importCareer } from "@/persistence/json-transfer";

interface SlotCardProps {
  readonly slot: CareerSlot;
  readonly summary: SlotSummary | null;
  readonly onChanged: () => void;
}

const download = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const SlotCard = ({ slot, summary, onChanged }: SlotCardProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const record = await loadSlot(slot);
    if (!record) return;
    download(`career-slot-${slot}.json`, exportCareer(record.state, new Date().toISOString()));
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const result = importCareer(text);
    if (!result.ok) {
      const detail = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
      window.alert(`Import failed:\n${detail}`);
      return;
    }
    if (summary !== null && !window.confirm("Replace the existing career in this slot?")) {
      return;
    }
    await commitSlot(slot, result.state, new Date().toISOString());
    onChanged();
  };

  const handleDelete = async () => {
    const message =
      "Delete this career? The in-game backup restore will no longer be available, but an exported JSON file can still be re-imported.";
    if (!window.confirm(message)) return;
    await deleteSlot(slot);
    onChanged();
  };

  const handleRestore = async () => {
    const restored = await restoreSlotBackup(slot);
    if (!restored) {
      window.alert("No backup available for this slot.");
      return;
    }
    onChanged();
  };

  return (
    <section className={`mode-card ${slot === 2 ? "green" : slot === 3 ? "pink" : ""}`} aria-label={`Save slot ${slot}`}>
      <span className={`card-label ${slot === 2 ? "green" : slot === 3 ? "pink" : ""}`}>
        Slot {slot}
      </span>
      <h2 className="card-title" style={{ fontSize: "1.15rem" }}>
        {summary === null ? "Free slot" : `Season ${summary.season}`}
      </h2>
      {summary === null ? (
        <p className="muted">Empty slot — start a new career here.</p>
      ) : (
        <dl className="stats-grid">
          <div><dt>Age</dt><dd>{summary.age}</dd></div>
          <div><dt>Overall</dt><dd>{summary.overall}</dd></div>
          <div><dt>Status</dt><dd>{summary.retired ? "Retired" : "Active"}</dd></div>
          <div><dt>Saved</dt><dd>{summary.committedAt.slice(0, 10)}</dd></div>
        </dl>
      )}
      <div className="button-row">
        {summary === null ? (
          <Link className="button primary" href={`/career/new?slot=${slot}`} data-game-action="new-career">
            New career
          </Link>
        ) : (
          <Link className="button primary" href={`/career/${slot}`} data-game-action="continue-career">
            Continue
          </Link>
        )}
        {summary !== null && (
          <button type="button" onClick={() => void handleExport()}>
            Export
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        {summary !== null && (
          <button type="button" onClick={() => void handleRestore()}>
            Restore backup
          </button>
        )}
        {summary !== null && (
          <button type="button" className="danger" onClick={() => void handleDelete()}>
            Delete
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImportFile(file);
          event.target.value = "";
        }}
      />
    </section>
  );
};
