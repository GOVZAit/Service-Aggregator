import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attemptAutomaticStaleAssetRecovery,
  isStaleAssetError,
  refreshToLatestApplication,
} from "@/lib/stale-asset-recovery";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (attemptAutomaticStaleAssetRecovery(error)) return;
    console.error("Route render failed", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    const staleAsset = isStaleAssetError(error);

    const title = offline
      ? "Этот раздел ещё не загружен"
      : staleAsset
        ? "Приложение обновилось"
        : "Не удалось открыть раздел";

    const description = offline
      ? "Для первого открытия этого раздела нужен интернет. После загрузки часть данных будет доступна из кэша."
      : staleAsset
        ? "Открыта предыдущая версия GOVZA. Обновите приложение, чтобы загрузить актуальные файлы."
        : "Перезагрузите приложение. Если ошибка повторится, вернитесь на главную.";

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5 safe-area-pt safe-area-pb">
        <div className="w-full max-w-md rounded-[1.75rem] border border-border/70 bg-card p-6 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {offline ? <WifiOff className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
          </div>
          <h1 className="mt-5 text-xl font-extrabold tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

          <div className="mt-6 grid gap-2">
            <Button
              className="h-12 rounded-2xl font-bold"
              disabled={offline}
              onClick={() => void refreshToLatestApplication()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {staleAsset ? "Обновить приложение" : "Перезагрузить"}
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl font-bold"
              onClick={() => window.location.assign("/")}
            >
              <Home className="mr-2 h-4 w-4" />
              На главную
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
