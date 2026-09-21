import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const TRIGGER_DISTANCE = 72;
const MAX_DISTANCE = 96;

export function PullToRefresh() {
  const queryClient = useQueryClient();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const currentDistance = useRef(0);

  useEffect(() => {
    const reset = () => {
      currentDistance.current = 0;
      setDistance(0);
      tracking.current = false;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || event.touches.length !== 1 || window.scrollY > 0) return;
      const touch = event.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      tracking.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking.current || event.touches.length !== 1) return;
      if (window.scrollY > 0) {
        reset();
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;

      if (deltaY <= 0 || Math.abs(deltaX) > deltaY * 0.8) {
        if (currentDistance.current > 0) reset();
        return;
      }

      event.preventDefault();
      const next = Math.min(MAX_DISTANCE, deltaY * 0.5);
      currentDistance.current = next;
      setDistance(next);
    };

    const onTouchEnd = () => {
      if (!tracking.current) return;
      const shouldRefresh = currentDistance.current >= TRIGGER_DISTANCE && navigator.onLine;
      reset();

      if (!shouldRefresh) return;

      setRefreshing(true);
      void queryClient.refetchQueries({ type: "active" }).finally(() => {
        setRefreshing(false);
      });
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", reset);
    };
  }, [queryClient, refreshing]);

  const visible = refreshing || distance > 4;
  const ready = distance >= TRIGGER_DISTANCE;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[100] -translate-x-1/2 transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div
        className="flex h-11 min-w-11 items-center justify-center rounded-full border border-border/70 bg-background/95 px-3 shadow-lg backdrop-blur-xl"
        style={{
          transform: `translateY(${refreshing ? 0 : Math.max(-16, distance - TRIGGER_DISTANCE)}px)`,
        }}
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-primary transition-transform",
            refreshing && "animate-spin",
            ready && !refreshing && "scale-110",
          )}
          style={!refreshing ? { transform: `rotate(${Math.min(180, distance * 2)}deg)` } : undefined}
        />
        {ready && !refreshing && (
          <span className="ml-2 text-[11px] font-bold text-foreground">Отпустите</span>
        )}
      </div>
    </div>
  );
}
