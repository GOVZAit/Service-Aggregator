import { FormEvent, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppBrandHeader } from "@/components/app-brand-header";

export default function ResetPasswordPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const token = new URLSearchParams(search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Пароли не совпадают");
    if (password.length < 6) return setError("Пароль должен содержать минимум 6 символов");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось изменить пароль");
      setSuccess(true);
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

        {success ? (
          <section className="premium-card mt-5 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.04em]">Пароль изменён</h1>
            <p className="mt-2 text-sm text-muted-foreground">Теперь войдите с новым паролем.</p>
            <Button className="accent-gradient mt-5 h-12 w-full rounded-2xl font-bold text-white" onClick={() => navigate("/auth")}>Перейти ко входу</Button>
          </section>
        ) : !token ? (
          <section className="premium-card mt-5 p-5">
            <h1 className="text-2xl font-extrabold tracking-[-0.04em]">Ссылка недействительна</h1>
            <p className="mt-2 text-sm text-muted-foreground">Запросите новую ссылку восстановления.</p>
            <Button className="mt-5 h-12 w-full rounded-2xl" onClick={() => navigate("/forgot-password")}>Запросить ссылку</Button>
          </section>
        ) : (
          <>
            <section className="hero-gradient mt-5 rounded-[1.75rem] border border-primary/15 p-5 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Lock className="h-6 w-6" /></div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.04em]">Новый пароль</h1>
              <p className="mt-2 text-sm text-muted-foreground">Придумайте новый пароль минимум из 6 символов.</p>
            </section>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Input className="h-14 rounded-2xl border-border/70 bg-card shadow-sm" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Новый пароль" required data-testid="input-reset-password" />
              <Input className="h-14 rounded-2xl border-border/70 bg-card shadow-sm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Повторите новый пароль" required data-testid="input-reset-confirm" />
              {error && <p className="rounded-2xl bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="accent-gradient h-12 w-full rounded-2xl font-bold text-white" disabled={loading} data-testid="button-reset-submit">
                {loading ? "Сохраняем…" : "Установить новый пароль"}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
