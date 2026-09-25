import { AppBrandHeader } from "@/components/app-brand-header";
import { cn } from "@/lib/utils";

interface SectionPageHeaderProps {
  title: string;
  subtitle?: string;
  city?: string;
  onLocationClick?: () => void;
  className?: string;
}

export function SectionPageHeader({
  title,
  subtitle,
  city,
  onLocationClick,
  className,
}: SectionPageHeaderProps) {
  return (
    <div className={cn("flex min-w-0 items-start justify-between gap-3", className)}>
      <div className="min-w-0 pt-0.5">
        <h1 className="truncate text-[1.35rem] font-extrabold tracking-[-0.035em] sm:text-[1.55rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      <AppBrandHeader
        compact
        city={city}
        onLocationClick={onLocationClick}
        className="shrink-0"
      />
    </div>
  );
}
