export type RoadmapStatus =
  | "available"
  | "in-progress"
  | "planned"
  | "ideas"
  | "wont-build";

export type RoadmapItem = {
  title: string;
  description?: string;
};

export type RoadmapCategory =
  | "available"
  | "inProgress"
  | "planned"
  | "ideas"
  | "wontBuild";

export type RoadmapData = Record<RoadmapCategory, RoadmapItem[]>;

export const roadmap: RoadmapData = {
  available: [
    { title: "Local-first storage" },
    { title: "Workspaces" },
    { title: "Stack Docs" },
    { title: "Opsly Mask" },
    { title: "Import / Export" },
    { title: "Advanced Search" },
    { title: "VS Code Extension"},
  ],
  inProgress: [
    {
      title: "Improved Rendered Output",
      description:
        "A cleaner reading experience with better spacing, typography, and Markdown rendering.",
    },
  ],
  planned: [
    {
      title: "Bring Your Own Database",
      description:
        "Use your own PostgreSQL database while keeping Markdown as the source of truth.",
    },
    {
      title: "End-to-End Encryption",
      description:
        "Protect sensitive notes without giving up a local-first workflow.",
    },
    {
      title: "Command Palette",
      description:
        "Quickly navigate files, workspaces, and actions without leaving the keyboard.",
    },
  ],
  ideas: [
    { title: "Theme customization" },
    { title: "AI-assisted documentation" },
  ],
  wontBuild: [
    { title: "Mandatory user accounts" },
    { title: "Required cloud storage" },
    { title: "Vendor lock-in" },
    { title: "Telemetry by default" },
    { title: "Features that exist only for marketing" },
  ],
};

export type RoadmapSectionData = {
  id: string;
  title: string;
  status: RoadmapStatus;
  subtitle?: string;
  items: RoadmapItem[];
};

export const ROADMAP_PAGE = {
  title: "Roadmap",
  intro: [
    "Everything here is subject to change.",
    "Features earn their place by solving real problems, not by making the checklist longer.",
  ],
  principlesTitle: "Principles",
  principles: [
    "Markdown first.",
    "Local first.",
    "Open source.",
    "Everything on this roadmap earns its place.",
  ],
} as const;

export const ROADMAP_HREF = "/roadmap";

export const ROADMAP_STATUS_ICONS: Record<RoadmapStatus, string> = {
  available: "✓",
  "in-progress": "🚧",
  planned: "○",
  ideas: "💡",
  "wont-build": "✕",
};

export const ROADMAP_ITEM_PREFIX: Partial<Record<RoadmapStatus, string>> = {
  available: "✓",
  ideas: "○",
  "wont-build": "✕",
};

export const ROADMAP_DETAILED_SECTIONS = new Set<RoadmapStatus>([
  "in-progress",
  "planned",
]);

const ROADMAP_SECTION_CONFIG: Array<{
  category: RoadmapCategory;
  id: string;
  title: string;
  status: RoadmapStatus;
  subtitle?: string;
}> = [
  {
    category: "available",
    id: "available",
    title: "Available Today",
    status: "available",
  },
  {
    category: "inProgress",
    id: "in-progress",
    title: "In Progress",
    status: "in-progress",
  },
  {
    category: "planned",
    id: "planned",
    title: "Planned",
    status: "planned",
  },
  {
    category: "ideas",
    id: "ideas",
    title: "Ideas",
    status: "ideas",
    subtitle: "These are explorations, not promises.",
  },
  {
    category: "wontBuild",
    id: "wont-build",
    title: "Won't Build",
    status: "wont-build",
    subtitle: "Some things don't belong in Opsly MD.",
  },
];

export const ROADMAP_SECTIONS: RoadmapSectionData[] =
  ROADMAP_SECTION_CONFIG.map(({ category, ...section }) => ({
    ...section,
    items: roadmap[category],
  }));

export function getRoadmapMarkdown(): string {
  const checkboxSection = (
    heading: string,
    items: RoadmapItem[],
    checked: boolean
  ) => {
    const marker = checked ? "x" : " ";
    const list = items.map((item) => `- [${marker}] ${item.title}`).join("\n");
    return `## ${heading}\n\n${list}`;
  };

  const bulletSection = (heading: string, items: RoadmapItem[]) => {
    const list = items.map((item) => `- ${item.title}`).join("\n");
    return `## ${heading}\n\n${list}`;
  };

  return [
    "# Roadmap",
    checkboxSection("Available today", roadmap.available, true),
    checkboxSection("In progress", roadmap.inProgress, false),
    checkboxSection("Planned", roadmap.planned, false),
    bulletSection("Ideas", roadmap.ideas),
    bulletSection("Won't build", roadmap.wontBuild),
  ].join("\n\n");
}
