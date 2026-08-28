"use client";

import { useRef, useState } from "react";
import type { World } from "@/game/domain/world";
import { previewWorld } from "@/game/world/import-world";
import { exportWorld, importWorldEnvelope } from "@/persistence/json-transfer";
import { saveActiveWorld } from "@/persistence/career-db";

export const WorldTransfer = ({ world, onReplaced }: { readonly world: World; readonly onReplaced: () => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [issues, setIssues] = useState<readonly { path: string; message: string }[]>([]);
  const [pendingWorld, setPendingWorld] = useState<World | null>(null);

  const preview = previewWorld(world);

  const handleExport = () => {
    const text = exportWorld(world, new Date().toISOString());
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "world.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = importWorldEnvelope(text);
    if (!result.ok) {
      setIssues(result.issues);
      setPendingWorld(null);
      return;
    }
    setIssues([]);
    setPendingWorld(result.world);
  };

  const handleConfirmReplace = async () => {
    if (!pendingWorld) return;
    await saveActiveWorld(pendingWorld);
    setPendingWorld(null);
    onReplaced();
  };

  return (
    <section className="panel" aria-label="World management">
      <h2>Active world</h2>
      <dl className="stats-grid" data-testid="world-counts">
        <div><dt>Countries</dt><dd>{preview.countryCount}</dd></div>
        <div><dt>Leagues</dt><dd>{preview.leagueCount}</dd></div>
        <div><dt>Clubs</dt><dd>{preview.clubCount}</dd></div>
      </dl>
      <div className="button-row">
        <button type="button" onClick={handleExport}>Export world</button>
        <button type="button" onClick={() => fileRef.current?.click()}>Import world</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
      {issues.length > 0 && (
        <div role="alert" className="error-text">
          <h3>Import issues</h3>
          <ul>
            {issues.map((issue, index) => (
              <li key={index}>{issue.path}: {issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      {pendingWorld !== null && (
        <div className="panel">
          <h3>Replace active world?</h3>
          <p>
            The imported world has {previewWorld(pendingWorld).clubCount} clubs.
            Existing careers keep their own embedded world; only new careers use the active world.
          </p>
          <div className="button-row">
            <button type="button" className="danger" onClick={() => void handleConfirmReplace()}>
              Replace active world
            </button>
            <button type="button" onClick={() => setPendingWorld(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
};
