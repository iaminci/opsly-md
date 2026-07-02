type RoadmapCardProps = {
  title: string;
  description?: string;
  prefix?: string;
};

export function RoadmapCard({ title, description, prefix }: RoadmapCardProps) {
  if (description) {
    return (
      <div className="space-y-1.5">
        <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-foreground sm:text-base">
      {prefix ? (
        <span className="mr-2 text-muted-foreground" aria-hidden>
          {prefix}
        </span>
      ) : null}
      {title}
    </p>
  );
}
