"use client";

// app/changelog/ChangelogClient.tsx

import { motion } from "framer-motion";
import { Sparkles, Bug, Zap, Wrench, AlertTriangle, Tag } from "lucide-react";
import type { ChangelogEntry, ChangeSection } from "./page";

// ─── Type badge config ────────────────────────────────────────────────────────

type SectionMeta = {
  icon: React.ReactNode;
  className: string;
  dotClass: string;
};

function getSectionMeta(type: ChangeSection["type"]): SectionMeta {
  switch (type) {
    case "feat":
      return {
        icon: <Sparkles size={12} />,
        className:
          "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
        dotClass: "bg-violet-400",
      };
    case "fix":
      return {
        icon: <Bug size={12} />,
        className:
          "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
        dotClass: "bg-rose-400",
      };
    case "breaking":
      return {
        icon: <AlertTriangle size={12} />,
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        dotClass: "bg-amber-400",
      };
    case "chore":
      return {
        icon: <Wrench size={12} />,
        className:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        dotClass: "bg-slate-400",
      };
    default:
      return {
        icon: <Zap size={12} />,
        className:
          "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
        dotClass: "bg-sky-400",
      };
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Tag size={24} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-medium text-foreground">No releases yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Run{" "}
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            npm run release
          </code>{" "}
          to generate your first changelog entry.
        </p>
      </div>
    </div>
  );
}

// ─── Single entry card ────────────────────────────────────────────────────────

function EntryCard({
  entry,
  index,
}: {
  entry: ChangelogEntry;
  index: number;
}) {
  const isLatest = entry.tag === "latest";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
      className="relative flex gap-6 md:gap-10"
    >
      {/* Timeline spine */}
      <div className="hidden md:flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full mt-1.5 ring-2 ring-background z-10 ${isLatest ? "bg-violet-500" : "bg-border"
            }`}
        />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>

      {/* Card */}
      <div className="flex-1 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="font-mono text-lg font-semibold tracking-tight text-foreground">
            v{entry.version}
          </span>

          {isLatest && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              <Sparkles size={10} />
              Latest
            </span>
          )}

          {entry.date && (
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(entry.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Sections */}
        {entry.sections.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No documented changes.
          </p>
        ) : (
          <div className="space-y-5">
            {entry.sections.map((section) => {
              const meta = getSectionMeta(section.type);
              return (
                <div key={section.label}>
                  {/* Section label */}
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full mb-3 ${meta.className}`}
                  >
                    {meta.icon}
                    {section.label}
                  </span>

                  {/* Items */}
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.07 + i * 0.04,
                        }}
                        className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${meta.dotClass}`}
                        />
                        <span
                          dangerouslySetInnerHTML={{
                            __html: item
                              // linkify PR refs like (#123)
                              .replace(
                                /\(#(\d+)\)/g,
                                '<a href="#" class="text-violet-600 dark:text-violet-400 hover:underline font-mono text-xs">(#$1)</a>'
                              )
                              // bold any `backtick` words
                              .replace(
                                /`([^`]+)`/g,
                                '<code class="font-mono text-[12px] bg-muted px-1 py-0.5 rounded">$1</code>'
                              ),
                          }}
                        />
                      </motion.li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function ChangelogClient({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            mcloud
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-3">
            Changelog
          </h1>
          <p className="text-muted-foreground text-base">
            New features, bug fixes, and improvements — auto-generated from git
            history.
          </p>
        </motion.div>

        {/* Entries */}
        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {entries.map((entry, i) => (
              <EntryCard key={entry.version} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}