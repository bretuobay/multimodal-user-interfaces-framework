"use client";

import { useState } from "react";
import styles from "./code-block.module.css";

export function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className={styles.copyButton} onClick={handleCopy} type="button">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
