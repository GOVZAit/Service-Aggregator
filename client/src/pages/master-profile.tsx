import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Heart, MapPin, Clock, BadgeCheck, Shield,
  MessageCircle, Phone, PhoneOff, Send, Image as ImageIcon, Loader2, Star, Building2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/ui/rating-stars";
import { BookingModal } from "@/components/booking-modal";
import { apiRequest } from "@/lib/queryClient";
import type { Master, ChatMessage } from "@shared/schema";

// ── Call availability logic ───────────────────────────────────────────────────

type CallState =
  | { status: 'active'; phone: string }
  | { status: 'offline'; note: string }
  | { status: 'outside_hours'; note: string }
  | { status: 'disabled' };

function getCallState(master: Master): CallState {
  if (master.callMode === 'disabled') return { status: 'disabled' };

  if (master.callMode === 'always') {
    return { status: 'active', phone: master.phone ?? '' };
  }

  if (master.callMode === 'online_only') {
    if (master.isOnline) return { status: 'active', phone: master.phone ?? '' };
    return { status: 'offline', note: 'Мастер сейчас офлайн' };
  }

  // schedule
  const now = new Date();
  const [fH, fM] = (master.workingHours?.from ?? '09:00').split(':').map(Number);
  const [tH, tM] = (master.workingHours?.to ?? '18:00').split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const fromMin = fH * 60 + fM;
  const toMin = tH * 60 + tM;
  if (nowMin >= fromMin && nowMin < toMin) {
    return { status: 'active', phone: master.phone ?? '' };
  }
  return {
    status: 'outside_hours',
    note: `Принимает звонки ${master.workingHours?.from ?? '09:00'}–${master.workingHours?.to ?? '18:00'}`,
  };
}

// ── Reviews ───────────────────────────────────────────────────────────────────

const reviewsByMasterId: Record<number, Array<{ name: string; avatar: string; rating: number; text: string; date: string; service: string }>> = {
  1: [
    { name: "Рамзан Д.", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=60&h=60&fit=crop&crop=face", rating: 5, text: "Умар пришёл в срок, работу сделал быстро и чисто. Кран больше не течёт! Буду обращаться ещё.", date: "10 апр 2026", service: "Замена смесителя" },
    { name: "Зара Э.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face", rating: 5, text: "Отличный специалист. Прочистил засор за 20 минут, объяснил причину и дал советы по профилактике.", date: "5 апр 2026", service: "Прочистка засора" },
    { name: "Аслан М.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face", rating: 4, text: "Хорошая работа, немного задержался, но предупредил заранее. Результатом доволен.", date: "28 мар 2026", service: "Установка унитаза" },
  ],
  2: [
    { name: "Лейла Г.", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=60&h=60&fit=crop&crop=face", rating: 5, text: "Зулейха — настоящий профессионал! Квартира блестит, всё сделала аккуратно и быстро.", date: "9 апр 2026", service: "Генеральная уборка" },
    { name: "Малика В.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face", rating: 5, text: "Второй раз пользуюсь услугами — всегда на высоте. Рекомендую всем!", date: "1 апр 2026", service: "Уборка 2-комн." },
  ],
  3: [
    { name: "Ибрагим Ч.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face", rating: 5, text: "Ислам разобрался со сложной проводкой, которую другие не брались делать. Настоящий профи.", date: "8 апр 2026", service: "Разводка проводки" },
    { name: "Хасан Э.", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60&h=60&fit=crop&crop=face", rating: 4, text: "Быстро и качественно заменил розетки. Цена соответствует работе.", date: "2 апр 2026", service: "Замена розетки" },
    { name: "Аиша Б.", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face", rating: 5, text: "Отлично установил щиток, гарантия 2 года — это подкупает. Звоните смело!", date: "20 мар 2026", service: "Установка щитка" },
  ],
};

const defaultReviews = [
  { name: "Клиент", avatar: "", rating: 5, text: "Отличная работа, всё сделано профессионально!", date: "Апрель 2026", service: "" },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MasterProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [revealPhone, setRevealPhone] = useState(false);

  const masterId = Number(id);

  const { data: master, isLoading: masterLoading } = useQuery<Master>({
    queryKey: [`/api/masters/${masterId}`],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/messages/${masterId}`],
    enabled: showChat,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest('POST', `/api/messages/${masterId}`, { text, sender: 'user' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${masterId}`] });
      setNewMessage("");
      setTimeout(() => {
        apiRequest('POST', `/api/messages/${masterId}`, {
          text: 'Отлично! Могу приехать сегодня после 15:00. Вам удобно?',
          sender: 'master'
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/messages/${masterId}`] });
        });
      }, 1500);
    },
  });

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (masterLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 safe-area-pt">
          <div className="flex items-center gap-4 max-w-lg mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <span className="font-semibold">Профиль мастера</span>
          </div>
        </header>
        <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
          <div className="rounded-2xl bg-card border border-border/60 p-6 space-y-4 animate-pulse">
            <div className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!master) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Мастер не найден</p>
      </div>
    );
  }

  const reviews = reviewsByMasterId[masterId] ?? defaultReviews;
  const callState = getCallState(master);

  // ── Chat view ─────────────────────────────────────────────────────────────
  if (showChat) {
    const allMessages = messages.length > 0 ? messages : [
      { id: 1, text: 'Здравствуйте! Чем могу помочь?', sender: 'master' as const, time: '10:30' }
    ];
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 safe-area-pt">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} data-testid="button-back-from-chat">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
              <AvatarFallback className="rounded-xl">{master.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{master.name}</p>
              <p className="text-xs text-green-500 font-medium">онлайн</p>
            </div>
            {callState.status === 'active' && (
              <a href={`tel:${callState.phone}`}>
                <Button variant="ghost" size="icon">
                  <Phone className="w-5 h-5" />
                </Button>
              </a>
            )}
          </div>
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-lg mx-auto">
            {messagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              allMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 bg-background border-t border-border p-4 safe-area-pb">
          <div className="flex items-center gap-2 max-w-lg mx-auto">
            <Button variant="ghost" size="icon">
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button size="icon" onClick={sendMessage} disabled={sendMessageMutation.isPending} data-testid="button-send-message">
              {sendMessageMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Profile view ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      {showBooking && (
        <BookingModal master={master} onClose={() => setShowBooking(false)} />
      )}

      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 safe-area-pt">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} data-testid="button-back">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <span className="font-semibold">Профиль мастера</span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsFavorite(!isFavorite)} data-testid="button-favorite-profile">
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {/* Profile card */}
        <div className="rounded-2xl bg-card border border-border/60 p-5 mb-4">
          <div className="flex gap-4 mb-4">
            <Avatar className="w-20 h-20 rounded-2xl shrink-0">
              <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
              <AvatarFallback className="rounded-2xl text-2xl">{master.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-bold truncate" data-testid="text-master-name">{master.name}</h1>
                {master.verified && <Shield className="w-4 h-4 text-green-500 shrink-0" />}
              </div>
              <p className="text-muted-foreground text-sm mb-2">{master.category}</p>
              {master.companyName && (
                <div
                  className="inline-flex items-center gap-1 max-w-full bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium mb-2"
                  data-testid="text-master-company"
                  title={master.companyName}
                >
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{master.companyName}</span>
                </div>
              )}
              <RatingStars rating={master.rating} reviews={master.reviews} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="w-3 h-3" />
                <span>{master.distance}</span>
                <span className="mx-1">·</span>
                <Clock className="w-3 h-3" />
                <span>{master.responseTime}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{master.description}</p>

          {/* Portfolio preview strip — visible immediately, full grid in the tab below */}
          {master.portfolio.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Примеры работ
                </p>
                <span className="text-xs text-muted-foreground" data-testid="text-portfolio-count">
                  {master.portfolio.length} фото
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {master.portfolio.slice(0, 3).map((img, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden bg-muted"
                    data-testid={`portfolio-preview-${idx}`}
                  >
                    <img
                      src={img}
                      alt={`Работа ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-primary/10 rounded-xl py-3 px-2">
              <p className="text-xl font-bold text-primary">{master.completedOrders}</p>
              <p className="text-xs text-muted-foreground">заказов</p>
            </div>
            <div className="bg-green-500/10 rounded-xl py-3 px-2">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{master.rating}</p>
              <p className="text-xs text-muted-foreground">рейтинг</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl py-3 px-2">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{master.price}</p>
              <p className="text-xs text-muted-foreground">цена</p>
            </div>
          </div>

          {master.verified && (
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-xl px-3 py-2">
              <BadgeCheck className="w-4 h-4 shrink-0" />
              <span>Личность и профессиональные навыки проверены командой 995</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="services" className="mb-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="services" data-testid="tab-services">Услуги</TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio">Портфолио</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">Отзывы ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-4 space-y-2">
            {master.services.map((service, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-card border border-border/60 p-4 flex items-center justify-between"
              >
                <span className="font-medium text-sm">{service.name}</span>
                <span className="font-bold text-primary text-sm">{service.price}</span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="portfolio" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {master.portfolio.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Работа ${idx + 1}`}
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                  data-testid={`portfolio-image-${idx}`}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3">
            <div className="rounded-xl bg-muted p-4 flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{master.rating}</p>
                <StarRow rating={Math.round(master.rating)} />
                <p className="text-xs text-muted-foreground mt-1">{master.reviews} отзывов</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = reviews.filter((r) => r.rating === stars).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-3">{stars}</span>
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {reviews.map((review, idx) => (
              <div key={idx} data-testid={`review-${idx}`} className="rounded-xl bg-card border border-border/60 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    {review.avatar ? (
                      <AvatarImage src={review.avatar} alt={review.name} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="text-xs font-bold">{review.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRow rating={review.rating} />
                      {review.service && <span className="text-xs text-muted-foreground">· {review.service}</span>}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">«{review.text}»</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-pb z-30">
        <div className="max-w-lg mx-auto space-y-2">
          {/* Call state banner */}
          {callState.status !== 'active' && callState.status !== 'disabled' && (
            <div className="text-center text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
              {callState.status === 'offline' && `📵 ${callState.note}`}
              {callState.status === 'outside_hours' && `🕐 ${callState.note}`}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowChat(true)}
              data-testid="button-chat"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Написать
            </Button>

            {callState.status === 'active' ? (
              revealPhone ? (
                <a
                  href={`tel:${callState.phone}`}
                  data-testid="link-call"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-semibold"
                >
                  <Phone className="w-4 h-4" />
                  {callState.phone}
                </a>
              ) : (
                <Button
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setRevealPhone(true)}
                  data-testid="button-call"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Позвонить
                </Button>
              )
            ) : callState.status === 'disabled' ? (
              <Button
                variant="outline"
                disabled
                className="flex-1 rounded-xl opacity-50"
                data-testid="button-call-disabled"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Звонки откл.
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                className="flex-1 rounded-xl opacity-60"
                data-testid="button-call-unavailable"
              >
                <Phone className="w-4 h-4 mr-2" />
                Недоступен
              </Button>
            )}

            <Button
              className="flex-1 rounded-xl"
              onClick={() => setShowBooking(true)}
              data-testid="button-book"
            >
              Записаться
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
