import { useState } from "react";
import { Plus, Search, X, Clock, MapPin, Tag, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/bottom-navigation";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ServiceRequest } from "@shared/schema";

const masterResponses: Record<number, Array<{ masterName: string; avatar: string; price: string; text: string; rating: number }>> = {
  1: [
    { masterName: "Умар Дудаев", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face", price: "2 000 ₽", text: "Здравствуйте! Готов приехать сегодня после 15:00. Замена смесителя займёт около 30 минут.", rating: 4.9 },
    { masterName: "Ахмад Мусаев", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=60&h=60&fit=crop&crop=face", price: "1 800 ₽", text: "Могу приехать завтра с утра. Работаю с гарантией.", rating: 4.6 },
  ],
  2: [
    { masterName: "Умар Дудаев", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face", price: "3 500 ₽", text: "Прочистка засора — моя специализация. Приеду в течение часа.", rating: 4.9 },
  ],
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(rating) ? "text-yellow-400 text-xs" : "text-muted-foreground/30 text-xs"}>★</span>
      ))}
    </div>
  );
}

function RequestCard({ request }: { request: ServiceRequest }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [chosenMaster, setChosenMaster] = useState<string | null>(null);

  const responses = masterResponses[request.id] ?? [];

  const handleChoose = (masterName: string) => {
    setChosenMaster(masterName);
    toast({
      title: "Мастер выбран!",
      description: `${masterName} получит уведомление и свяжется с вами.`,
    });
  };

  return (
    <div data-testid={`card-request-${request.id}`} className="rounded-2xl bg-card border border-border/60 overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{request.title}</h3>
          <span className="shrink-0 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {request.category}
          </span>
        </div>

        <p className={cn("text-xs text-muted-foreground leading-relaxed", !expanded && "line-clamp-2")}>
          {request.description}
        </p>

        {request.description.length > 80 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary font-medium"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" />Свернуть</> : <><ChevronDown className="w-3 h-3" />Читать полностью</>}
          </button>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{request.budget}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{request.location}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{request.postedAt}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <img src={request.user.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
            <span>{request.user.name}</span>
          </div>
          {responses.length > 0 ? (
            <button
              onClick={() => setShowResponses((v) => !v)}
              data-testid={`button-show-responses-${request.id}`}
              className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {responses.length} {responses.length === 1 ? "отклик" : "отклика"}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">{request.responses} откликов</span>
          )}
        </div>
      </div>

      {/* Responses from masters */}
      {showResponses && responses.length > 0 && (
        <div className="border-t border-border/60 bg-muted/30">
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Отклики мастеров
          </div>
          <div className="divide-y divide-border/60">
            {responses.map((resp, i) => (
              <div key={i} data-testid={`response-${request.id}-${i}`} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <img src={resp.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{resp.masterName}</p>
                      <p className="text-sm font-bold text-primary">{resp.price}</p>
                    </div>
                    <StarRow rating={resp.rating} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">«{resp.text}»</p>
                {chosenMaster === resp.masterName ? (
                  <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                    ✓ Вы выбрали этого мастера
                  </div>
                ) : chosenMaster ? null : (
                  <button
                    onClick={() => handleChoose(resp.masterName)}
                    data-testid={`button-choose-master-${i}`}
                    className="w-full py-2 rounded-xl bg-primary text-white text-xs font-semibold"
                  >
                    Выбрать мастера
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/requests'],
  });

  const handleCreate = () => {
    toast({
      title: "Скоро",
      description: "Создание заявок будет доступно в следующей версии",
    });
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 safe-area-pt">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Заявки</h1>
            <p className="text-xs text-muted-foreground">Заявки клиентов на услуги</p>
          </div>
          <Button
            size="icon"
            onClick={handleCreate}
            data-testid="button-create-request"
            className="rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border/60 p-4 space-y-3 animate-pulse">
                <div className="flex justify-between gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="w-10 h-10" />}
            title="Нет активных заявок"
            description="Клиенты пока не размещали заявки. Следите за обновлениями — здесь появятся новые задачи."
            action={
              <Button onClick={handleCreate} className="rounded-xl" data-testid="button-create-first-request">
                <Plus className="w-4 h-4 mr-2" />
                Создать заявку
              </Button>
            }
          />
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
