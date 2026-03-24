import { type JSX } from "react";
import { codeToHtml } from "shiki";
import { StaticCodeBlock } from "./code-frame";

export interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  copyable?: boolean;
  className?: string;
  html?: string;
}

const theme = {
  name: "muix-ocean",
  type: "dark" as const,
  colors: {
    "editor.background": "#07131f",
    "editor.foreground": "#e9f6ff",
    "editor.lineHighlightBackground": "#0d1f30",
    "editor.selectionBackground": "#123149",
  },
  tokenColors: [
    { scope: ["comment"], settings: { foreground: "#6f8ca1" } },
    { scope: ["string"], settings: { foreground: "#92f0ff" } },
    { scope: ["number", "constant"], settings: { foreground: "#ffd37f" } },
    { scope: ["keyword", "storage"], settings: { foreground: "#58d3ff", fontStyle: "bold" } },
    { scope: ["entity.name.function", "support.function"], settings: { foreground: "#ffffff" } },
    { scope: ["variable", "identifier"], settings: { foreground: "#d4ecff" } },
    { scope: ["entity.name.type", "support.type"], settings: { foreground: "#8ae6b4" } },
    { scope: ["punctuation"], settings: { foreground: "#93adbf" } },
  ],
};

export async function highlightCode(code: string, language = "ts"): Promise<string> {
  return codeToHtml(code, {
    lang: language,
    theme,
  });
}

export async function CodeBlock({
  code,
  language = "ts",
  title,
  copyable = true,
  className,
  html,
}: CodeBlockProps): Promise<JSX.Element> {
  const renderedHtml = html ?? (await highlightCode(code, language));

  return (
    <StaticCodeBlock
      className={className}
      code={code}
      copyable={copyable}
      html={renderedHtml}
      language={language}
      title={title}
    />
  );
}
