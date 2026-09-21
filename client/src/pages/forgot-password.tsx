import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, AtSign, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppBrandHeader } from "@/components/app-brand-header";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось отправить запрос");
      setMessage(data.message);
      setDeliveryUnavailable(data.delivery === "not_configured");
    } catch (requestError: any) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background safe-area-pt">
      <main className="mx-auto max-w-md px-4 py-6">
        <AppBrandHeader compact />
        <button onClick={() => navigate("/auth")} className="mt-6 flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />Назад ко входу
        </button>

        <section className="hero-gradient mt-5 rounded-[1.75rem] border border-primary/15 p-5 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.04em]">Восстановление пароля</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Укажите телефон или email аккаунта. Ссылка для нового пароля действует 10 минут.
          </p>
        </section>

        {message ? (
          <div className="premium-card mt-5 space-y-3 p-5" data-testid="forgot-password-result">
            <p className="text-sm leading-relaxed">{message}</p>
            {deliveryUnavailable && (
              <p className="rounded-2xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                Доставка сообщений пока не подключена, поэтому инструкция ещё не может быть отправлена.
              </p>
            )}
            <Button variant="outline" className="h-12 w-full rounded-2xl" onClick={() => navigate("/auth")}>Вернуться ко входу</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold">Телефон или email</span>
              <div className="relative mt-2">
                <AtSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="+7 999 000-00-00 или name@mail.ru"
                  className="h-14 rounded-2xl border-border/70 bg-card pl-11 shadow-sm"
                  required
                  data-testid="input-forgot-identifier"
                />
              </div>
            </label>
            {error && <p className="rounded-2xl bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="accent-gradient h-12 w-full rounded-2xl font-bold text-white" disabled={loading} data-testid="button-forgot-submit">
              {loading ? "Отправляем…" : "Получить инструкцию"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
