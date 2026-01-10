import type { Category } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Wrench, Zap, Sparkles, Hammer, Palette, Car, Package, BookOpen, type LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Wrench,
  Zap,
  Sparkles,
  Hammer,
  Palette,
  Car,
  Package,
  BookOpen,
};

interface CategoryCardProps {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
}

export function CategoryCard({ category, isSelected, onSelect }: CategoryCardProps) {
  const Icon = iconMap[category.iconName] || Wrench;
  
  return (
    <button
      onClick={onSelect}
      data-testid={`category-card-${category.id}`}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl bg-card transition-all duration-200",
        "hover-elevate active-elevate-2",
        isSelected && "ring-2"
      )}
      style={{
        ringColor: isSelected ? category.color : undefined,
        borderColor: isSelected ? category.color : undefined,
      }}
    >
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: `${category.color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: category.color }} />
      </div>
      <span className="text-xs font-medium text-foreground text-center leading-tight">
        {category.name}
      </span>
    </button>
  );
}
