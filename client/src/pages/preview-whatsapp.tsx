import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Search, MoreVertical, Phone, Video, Paperclip,
  Camera, Smile, Mic, Check, CheckCheck, MessageCircle,
} from "lucide-react";

const WA_GREEN = "#075E54";
const WA_TEAL = "#128C7E";
const WA_LIGHT_GREEN = "#25D366";
const WA_BUBBLE_OUT = "#DCF8C6";
const WA_BG = "#ECE5DD";

type Chat = {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  category: string;
  brand?: string;
};

const chats: Chat[] = [
  { id: 1, name: "Зулейха Хасанова", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", lastMessage: "Хорошо, буду в 15:00", time: "12:42", unread: 2, online: true, category: "Уборка", brand: "Чистый Дом" },
  { id: 2, name: "Умар Дудаев", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face", lastMessage: "Уже еду к вам", time: "12:30", unread: 0, online: true, category: "Сантехника" },
  { id: 3, name: "Хасан Гайтаев", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face", lastMessage: "Скиньте фото комнаты, посчитаю", time: "11:18", unread: 0, online: false, category: "Ремонт", brand: "Рем-Бригада «Грозный»" },
  { id: 4, name: "Айна Мусаева", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face", lastMessage: "Маникюр + педикюр — 2 500 ₽", time: "вчера", unread: 0, online: false, category: "Красота" },
  { id: 5, name: "Заур Эдилов", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=200&h=200&fit=crop&crop=face", lastMessage: "Доставка через 20 минут", time: "вчера", unread: 1, online: true, category: "Доставка", brand: "Грозный-Экспресс" },
];

type Msg = { id: number; text: string; time: string; out: boolean; read?: boolean };

const initialMessages: Msg[] = [
  { id: 1, text: "Здравствуйте! Можно убрать 2-комнатную завтра в 14:00?", time: "12:35", out: true, read: true },
  { id: 2, text: "Здравствуйте! Да, могу. Адрес и подъезд скиньте, пожалуйста.", time: "12:38", out: false },
  { id: 3, text: "ул. Шейха Мансура 45, кв. 12, подъезд 2, код 1234", time: "12:39", out: true, read: true },
  { id: 4, text: "Уборка стандартная — 3 000 ₽. Окна нужно мыть?", time: "12:41", out: false },
  { id: 5, text: "Хорошо, буду в 15:00", time: "12:42", out: false },
];

export default function PreviewWhatsApp() {
  const [openChat, setOpenChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages([...messages, {
      id: Date.now(),
      text: input.trim(),
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      out: true,
      read: false,
    }]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Top notice bar */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-amber-900 dark:text-amber-200">
          Демо стиля «WhatsApp». Это превью — основное приложение не затронуто.
        </p>
        <Link href="/" className="text-xs text-amber-900 dark:text-amber-200 underline whitespace-nowrap ml-2">
          К приложению
        </Link>
      </div>

      <div className="max-w-md mx-auto bg-white dark:bg-neutral-950 min-h-[calc(100vh-32px)] flex flex-col shadow-xl">
        {!openChat ? (
          <ChatList chats={chats} onOpen={setOpenChat} />
        ) : (
          <ChatView
            chat={openChat}
            messages={messages}
            input={input}
            setInput={setInput}
            onSend={send}
            onBack={() => setOpenChat(null)}
          />
        )}
      </div>
    </div>
  );
}

function ChatList({ chats, onOpen }: { chats: Chat[]; onOpen: (c: Chat) => void }) {
  return (
    <>
      {/* Header */}
      <header className="text-white px-4 py-3 flex items-center justify-between" style={{ background: WA_GREEN }}>
        <h1 className="text-xl font-semibold tracking-wide">Служба 995 Чаты</h1>
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5" />
          <MoreVertical className="w-5 h-5" />
        </div>
      </header>

      {/* Tabs (whatsapp-style) */}
      <div className="flex text-sm font-semibold text-white" style={{ background: WA_GREEN }}>
        <button className="flex-1 py-3 border-b-[3px] border-white">ЧАТЫ</button>
        <button className="flex-1 py-3 opacity-70">ЗАЯВКИ</button>
        <button className="flex-1 py-3 opacity-70">ЗВОНКИ</button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-950">
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-left"
          >
            <div className="relative shrink-0">
              <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-full object-cover" />
              {c.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-neutral-950" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{c.name}</span>
                </div>
                <span className={`text-xs shrink-0 ${c.unread > 0 ? "text-green-600 font-semibold" : "text-neutral-500"}`}>
                  {c.time}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                  {c.brand ? `${c.brand} · ` : ""}{c.lastMessage}
                </p>
                {c.unread > 0 && (
                  <span
                    className="shrink-0 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center"
                    style={{ background: WA_LIGHT_GREEN }}
                  >
                    {c.unread}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">{c.category}</p>
            </div>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button
        className="fixed bottom-6 right-6 md:right-[calc(50%-200px+24px)] w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ background: WA_LIGHT_GREEN }}
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </>
  );
}

function ChatView({
  chat, messages, input, setInput, onSend, onBack,
}: {
  chat: Chat; messages: Msg[]; input: string;
  setInput: (v: string) => void; onSend: () => void; onBack: () => void;
}) {
  return (
    <>
      {/* Header */}
      <header className="text-white px-3 py-2 flex items-center gap-3" style={{ background: WA_GREEN }}>
        <button onClick={onBack} aria-label="Назад"><ArrowLeft className="w-5 h-5" /></button>
        <img src={chat.avatar} alt={chat.name} className="w-9 h-9 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] truncate">{chat.name}</p>
          <p className="text-[11px] opacity-80 truncate">
            {chat.brand ? `${chat.brand} · ` : ""}
            {chat.online ? "в сети" : "был(а) недавно"}
          </p>
        </div>
        <Video className="w-5 h-5 opacity-90" />
        <Phone className="w-5 h-5 opacity-90" />
        <MoreVertical className="w-5 h-5 opacity-90" />
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
        style={{
          background: WA_BG,
          backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.out ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-lg px-2.5 py-1.5 shadow-sm relative"
              style={{
                background: m.out ? WA_BUBBLE_OUT : "#ffffff",
                borderTopRightRadius: m.out ? 4 : 12,
                borderTopLeftRadius: m.out ? 12 : 4,
              }}
            >
              <p className="text-[14px] text-neutral-900 leading-snug pr-12">{m.text}</p>
              <div className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[10px] text-neutral-500">
                <span>{m.time}</span>
                {m.out && (m.read
                  ? <CheckCheck className="w-3 h-3" style={{ color: "#34B7F1" }} />
                  : <Check className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-2 py-2 flex items-end gap-2 bg-neutral-100 dark:bg-neutral-900">
        <div className="flex-1 bg-white dark:bg-neutral-800 rounded-full px-3 py-2 flex items-center gap-2 shadow-sm">
          <Smile className="w-5 h-5 text-neutral-500 shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Сообщение"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-900 dark:text-neutral-100"
          />
          <Paperclip className="w-5 h-5 text-neutral-500 shrink-0" />
          <Camera className="w-5 h-5 text-neutral-500 shrink-0" />
        </div>
        <button
          onClick={onSend}
          className="w-11 h-11 rounded-full text-white flex items-center justify-center shrink-0"
          style={{ background: input.trim() ? WA_TEAL : WA_LIGHT_GREEN }}
          aria-label="Отправить"
        >
          {input.trim() ? <span className="text-lg">➤</span> : <Mic className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
