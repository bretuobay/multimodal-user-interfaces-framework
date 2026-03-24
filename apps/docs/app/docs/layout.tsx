import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./layout.module.css";

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

const demoHref = process.env.NEXT_PUBLIC_WEB_DEMO_URL ?? "http://localhost:3000";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>
            <span className={styles.brandDot} />
            MUIX Docs
          </span>
          <span className={styles.brandCopy}>
            Browser-native primitives for streaming multimodal interfaces.
          </span>
        </Link>

        {NAV.map((section) => (
          <div className={styles.navGroup} key={section.label}>
            <div className={styles.navLabel}>{section.label}</div>
            {section.items.map((item) => (
              <Link className={styles.navLink} key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.contentWrap}>
        <div className={styles.topbar}>
          <div className={styles.topbarKicker}>Reference and implementation guide</div>
          <Link className={styles.topbarLink} href={demoHref}>
            Launch demo
          </Link>
        </div>
        <main className={styles.main}>
          <article className={styles.article}>{children}</article>
        </main>
      </div>
    </div>
  );
}
