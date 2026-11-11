"use client";

import { useState } from "react";
import { NewBookForm } from "./NewBookForm";
import { EpubImport } from "./EpubImport";
import st from "@/components/reader/SettingsSheet.module.css";

export function NewBookChooser() {
  const [mode, setMode] = useState<"write" | "import">("write");
  return (
    <>
      <div className={st.seg} role="group" aria-label="How to start" style={{ marginBottom: 32 }}>
        <button type="button" className={st.opt} aria-pressed={mode === "write"} onClick={() => setMode("write")}>Start writing</button>
        <button type="button" className={st.opt} aria-pressed={mode === "import"} onClick={() => setMode("import")}>Import an EPUB</button>
      </div>
      {mode === "write" ? <NewBookForm /> : <EpubImport />}
    </>
  );
}
