import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Clock,
  BadgeCheck,
  Shield,
  MessageCircle,
  Phone,
  Send,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/ui/rating-stars";
import { apiRequest } from "@/lib/queryClient";
import type { Master, ChatMessage } from "@shared/schema";

export default function MasterProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState("");

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
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
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

  if (showChat) {
    const allMessages = messages.length > 0 ? messages : [
      { id: 1, text: 'Здравствуйте! Чем могу помочь?', sender: 'master' as const, time: '10:30' }
    ];

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 safe-area-pt">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChat(false)}
              data-testid="button-back-from-chat"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
              <AvatarFallback className="rounded-xl">{master.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{master.name}</p>
              <p className="text-xs text-muted-foreground">онлайн</p>
            </div>
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
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
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
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
            <Button 
              size="icon" 
              onClick={sendMessage} 
              disabled={sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 safe-area-pt">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <span className="font-semibold">Профиль мастера</span>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <Card className="p-6 mb-4">
          <div className="flex gap-4 mb-5">
            <Avatar className="w-20 h-20 rounded-2xl">
              <AvatarImage src={master.avatar} alt={master.name} className="object-cover" />
              <AvatarFallback className="rounded-2xl text-2xl">
                {master.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold truncate">{master.name}</h1>
                {master.verified && <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />}
              </div>
              <p className="text-muted-foreground mb-2">{master.category}</p>
              <div className="flex items-center gap-4">
                <RatingStars rating={master.rating} reviews={master.reviews} />
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {master.distance}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
              data-testid="button-favorite-profile"
            >
              <Heart
                className={`w-6 h-6 ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'
                }`}
              />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {master.description}
          </p>

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
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{master.responseTime}</p>
              <p className="text-xs text-muted-foreground">ответ</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="services" className="mb-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="services" data-testid="tab-services">Услуги</TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio">Портфолио</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">Отзывы</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-4 space-y-2">
            {master.services.map((service, idx) => (
              <Card key={idx} className="p-4 flex items-center justify-between">
                <span className="font-medium">{service.name}</span>
                <span className="font-bold text-primary">{service.price}</span>
              </Card>
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
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Отзывы пока не загружены</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-pb">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowChat(true)}
              data-testid="button-chat"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Написать
            </Button>
            <Button className="flex-1" data-testid="button-book">
              Заказать
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
