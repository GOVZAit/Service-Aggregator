import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, AtSign, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось отправить запрос");
      setMessage(data.message);
      setDeliveryUnavailable(data.emailDelivery === "not_configured");
    } catch (requestError: any) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <main className="max-w-md mx-auto">
        <button onClick={() => navigate("/auth")} className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
          <ArrowLeft className="w-4 h-4" />Назад ко входу
        </button>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
          <MailCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Восстановление пароля</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Укажите email аккаунта. Ссылка для установки нового пароля будет действовать 30 минут.
        </p>

        {message ? (
          <div className="rounded-2xl border bg-card p-4 space-y-3" data-testid="forgot-password-result">
            <p className="text-sm">{message}</p>
            {deliveryUnavailable && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Почтовая отправка пока не подключена, поэтому письмо ещё не может быть доставлено.
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>Вернуться ко входу</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <div className="relative mt-2">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@mail.ru"
                  className="pl-9"
                  required
                  data-testid="input-forgot-email"
                />
              </div>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12" disabled={loading} data-testid="button-forgot-submit">
              {loading ? "Отправляем..." : "Получить ссылку"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}