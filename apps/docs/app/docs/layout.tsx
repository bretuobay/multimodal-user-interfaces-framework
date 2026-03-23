import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  {
    label: "Introduction",
    items: [
      { href: "/docs/getting-started", label: "Getting Started" },
    ],
  },
  {
    label: "Core",
    items: [
      { href: "/docs/core", label: "@muix/core" },
      { href: "/docs/capability", label: "@muix/capability" },
      { href: "/docs/policy", label: "@muix/policy" },
    ],
  },
  {
    label: "Modalities",
    items: [
      { href: "/docs/text", label: "@muix/text" },
      { href: "/docs/agent", label: "@muix/agent" },
      { href: "/docs/audio", label: "@muix/audio" },
      { href: "/docs/video", label: "@muix/video" },
      { href: "/docs/motion", label: "@muix/motion" },
    ],
  },
  {
    label: "Framework Adapters",
    items: [
      { href: "/docs/react", label: "@muix/react" },
      { href: "/docs/vue", label: "@muix/vue" },
      { href: "/docs/solid", label: "@muix/solid" },
      { href: "/docs/wc", label: "@muix/wc" },
    ],
  },
  {
    label: "Tooling",
    items: [
      { href: "/docs/devtools", label: "@muix/devtools" },
    ],
  },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <nav
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--sidebar-bg)",
          padding: "1.5rem 0",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <Link
          href="/"
          style={{
            display: "block",
            fontWeight: 700,
            fontSize: "1rem",
            padding: "0 1.25rem",
            marginBottom: "1.5rem",
            color: "var(--fg)",
            letterSpacing: "-0.01em",
          }}
        >
          ⬡ MUIX
        </Link>

        {NAV.map((section) => (
          <div key={section.label} style={{ marginBottom: "1.25rem" }}>
            <div
              style={{
                padding: "0 1.25rem",
                marginBottom: "0.35rem",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "0.3rem 1.25rem",
                  fontSize: "0.875rem",
                  color: "var(--fg)",
                  borderRadius: 0,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Content */}
      <main
        style={{
          flex: 1,
          padding: "3rem 3.5rem",
          maxWidth: 800,
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}
