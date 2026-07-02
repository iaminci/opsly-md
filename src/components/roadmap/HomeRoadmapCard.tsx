import Link from "next/link";
import { getHomeRoadmapPreview, ROADMAP_HREF } from "@/lib/roadmap";

const cardClassName =
  "flex h-full flex-col rounded-base border border-border bg-background p-6 shadow-shadow sm:p-8";

type HomeRoadmapCardProps = {
  number: string;
};

export function HomeRoadmapCard({ number }: HomeRoadmapCardProps) {
  const { inProgress, upNext } = getHomeRoadmapPreview();

  return (
    <article id="roadmap" className={cardClassName}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-background font-heading text-sm font-bold text-primary shadow-shadow">
          {number}
        </span>
        <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
          Roadmap
        </h2>
      </div>

      <div className="mt-7 flex flex-1 flex-col text-base leading-snug text-muted-foreground sm:text-lg">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-tight text-foreground sm:text-base">
            Building Now
          </p>
          <div className="mt-2 space-y-1">
            {inProgress.map((item) => (
              <p key={item.title}>{item.title}</p>
            ))}
          </div>
        </div>

        <div
          className="my-5 border-t border-border sm:my-6"
          aria-hidden
        />

        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-tight text-foreground sm:text-base">
            Up Next
          </p>
          <ul className="mt-2 space-y-1">
            {upNext.map((item) => (
              <li key={item.title}>• {item.title}</li>
            ))}
          </ul>
        </div>

        <Link
          href={ROADMAP_HREF}
          className="mt-auto inline-block pt-6 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base"
        >
          View Roadmap →
        </Link>
      </div>
    </article>
  );
}
