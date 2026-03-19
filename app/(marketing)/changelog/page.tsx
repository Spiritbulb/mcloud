// app/changelog/page.tsx
// Reads CHANGELOG.md at build time (or on-demand in dev).
// Run `npm run release` to regenerate CHANGELOG.md from git history.

import fs from "fs";
import path from "path";
import { ChangelogClient } from "./changelog-client";

export const metadata = {
    title: "Changelog",
    description: "A history of updates, fixes, and new features.",
};

export type ChangeSection = {
    type: "feat" | "fix" | "breaking" | "chore" | "other";
    label: string;
    items: string[];
};

export type ChangelogEntry = {
    version: string;
    date: string;
    tag?: string;
    sections: ChangeSection[];
};

const SECTION_MAP: Record<string, ChangeSection["type"]> = {
    Features: "feat",
    "New Features": "feat",
    "Bug Fixes": "fix",
    Fixes: "fix",
    "BREAKING CHANGES": "breaking",
    "Breaking Changes": "breaking",
    Chores: "chore",
    Maintenance: "chore",
    Documentation: "chore",
    Performance: "feat",
    Refactoring: "chore",
};

const LABEL_MAP: Record<string, string> = {
    Features: "Features",
    "New Features": "Features",
    "Bug Fixes": "Bug Fixes",
    Fixes: "Bug Fixes",
    "BREAKING CHANGES": "Breaking Changes",
    "Breaking Changes": "Breaking Changes",
    Chores: "Maintenance",
    Maintenance: "Maintenance",
    Documentation: "Docs",
    Performance: "Performance",
    Refactoring: "Refactoring",
};

function parseChangelog(content: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const blocks = content.split(/^## /m).slice(1);

    for (const block of blocks) {
        const lines = block.trim().split("\n");
        const header = lines[0];

        const vMatch = header.match(/\[?([\d]+\.[\d]+\.[\d]+)\]?/);
        const dMatch = header.match(/(\d{4}-\d{2}-\d{2})/);
        if (!vMatch) continue;

        const version = vMatch[1];
        const date = dMatch ? dMatch[1] : "";

        const sectionMap: Record<string, string[]> = {};
        let current = "Other";

        for (const line of lines.slice(1)) {
            const sh = line.match(/^###\s+(.+)/);
            if (sh) {
                current = sh[1].trim();
                if (!sectionMap[current]) sectionMap[current] = [];
                continue;
            }
            const item = line.match(/^[*\-]\s+(.+)/);
            if (item && item[1].trim()) {
                if (!sectionMap[current]) sectionMap[current] = [];
                const cleaned = item[1]
                    .replace(/\s*\(\[[\da-f]{7,}\]\([^)]+\)\)/g, "")
                    .replace(/\s*\([a-f0-9]{7,}\)/g, "")
                    .trim();
                if (cleaned) sectionMap[current].push(cleaned);
            }
        }

        const sections: ChangeSection[] = Object.entries(sectionMap)
            .filter(([, items]) => items.length > 0)
            .map(([name, items]) => ({
                type: SECTION_MAP[name] ?? "other",
                label: LABEL_MAP[name] ?? name,
                items,
            }));

        if (sections.length > 0 || version) {
            entries.push({ version, date, sections });
        }
    }

    if (entries.length > 0) entries[0].tag = "latest";
    return entries;
}

export default function ChangelogPage() {
    const mdPath = path.join(process.cwd(), "CHANGELOG.md");
    let entries: ChangelogEntry[] = [];

    if (fs.existsSync(mdPath)) {
        entries = parseChangelog(fs.readFileSync(mdPath, "utf-8"));
    }

    return <ChangelogClient entries={entries} />;
}