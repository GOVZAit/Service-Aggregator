import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface PortfolioLightboxProps {
  images: string[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function PortfolioLightbox({ images, index, onIndexChange }: PortfolioLightboxProps) {
  const open = index !== null && images.length > 0;
  const safeIndex = index === null ? 0 : Math.min(Math.max(index, 0), images.length - 1);
  const hasMany = images.length > 1;

  const previous = () => {
    if (!hasMany) return;
    onIndexChange((safeIndex - 1 + images.length) % images.length);
  };

  const next = () => {
    if (!hasMany) return;
    onIndexChange((safeIndex + 1) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onIndexChange(null)}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none border-0 bg-black p-0 text-white sm:rounded-none">
        <DialogTitle className="sr-only">Портфолио исполнителя</DialogTitle>
        <DialogDescription className="sr-only">
          Полноэкранный просмотр фотографий портфолио.
        </DialogDescription>

        <div className="relative flex h-full w-full items-center justify-center px-4 py-16 safe-area-pt safe-area-pb">
          <img
            src={images[safeIndex]}
            alt={`Работа ${safeIndex + 1}`}
            className="max-h-full max-w-full select-none object-contain"
          />

          {hasMany && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                onClick={previous}
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                onClick={next}
                aria-label="Следующее фото"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold backdrop-blur">
            {safeIndex + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
