import { type JSX } from "react";
import { CodeCopyButton } from "./code-copy-button";
import styles from "./code-block.module.css";

export interface StaticCodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  copyable?: boolean;
  className?: string;
  html: string;
}

export function StaticCodeBlock({
  code,
  language = "ts",
  title,
  copyable = true,
  className,
  html,
}: StaticCodeBlockProps): JSX.Element {
  return (
    <div className={[styles.frame, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.meta}>
          {title ? <span className={styles.title}>{title}</span> : null}
          <span className={styles.language}>{language}</span>
        </div>
        {copyable ? <CodeCopyButton code={code} /> : null}
      </div>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
