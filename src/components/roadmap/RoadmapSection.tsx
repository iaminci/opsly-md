import { cn } from "@/lib/utils";
import {
  ROADMAP_DETAILED_SECTIONS,
  ROADMAP_ITEM_PREFIX,
  ROADMAP_STATUS_ICONS,
  type RoadmapSectionData,
} from "@/lib/roadmap";
import { RoadmapCard } from "@/components/roadmap/RoadmapCard";

type RoadmapSectionProps = {
  section: RoadmapSectionData;
};

export function RoadmapSection({ section }: RoadmapSectionProps) {
  const isDetailed = ROADMAP_DETAILED_SECTIONS.has(section.status);
  const itemPrefix = ROADMAP_ITEM_PREFIX[section.status];

  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="border-b border-border py-8 sm:py-10"
    >
      <h2
        id={`${section.id}-heading`}
        className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl"
      >
        <span className="mr-2" aria-hidden>
          {ROADMAP_STATUS_ICONS[section.status]}
        </span>
        {section.title}
      </h2>
      {section.subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {section.subtitle}
        </p>
      ) : null}
      <div
        className={cn("mt-5", isDetailed ? "space-y-6 sm:space-y-7" : "space-y-2")}
      >
        {section.items.map((item) => (
          <RoadmapCard
            key={item.title}
            title={item.title}
            description={isDetailed ? item.description : undefined}
            prefix={!isDetailed ? itemPrefix : undefined}
          />
        ))}
      </div>
    </section>
  );
}
