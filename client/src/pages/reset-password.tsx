import { FormEvent, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="min-h-screen bg-background px-4 py-12">
      <main className="max-w-md mx-auto">
        <button onClick={() => navigate("/auth")} className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
          <ArrowLeft className="w-4 h-4" />Назад ко входу
        </button>
        {success ? (
          <div className="text-center rounded-2xl border bg-card p-6">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold">Пароль изменён</h1>
            <p className="text-sm text-muted-foreground mt-2 mb-5">Теперь войдите с новым паролем.</p>
            <Button className="w-full" onClick={() => navigate("/auth")}>Перейти ко входу</Button>
          </div>
        ) : !token ? (
          <div className="rounded-2xl border bg-card p-5">
            <h1 className="text-xl font-bold">Ссылка недействительна</h1>
            <p className="text-sm text-muted-foreground mt-2 mb-5">Запросите новую ссылку восстановления.</p>
            <Button className="w-full" onClick={() => navigate("/forgot-password")}>Запросить ссылку</Button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5"><Lock className="w-6 h-6" /></div>
            <h1 className="text-2xl font-bold">Новый пароль</h1>
            <p className="text-sm text-muted-foreground mt-2 mb-6">Придумайте новый пароль минимум из 6 символов.</p>
            <form onSubmit={submit} className="space-y-4">
              <Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Новый пароль" required data-testid="input-reset-password" />
              <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Повторите новый пароль" required data-testid="input-reset-confirm" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-12" disabled={loading} data-testid="button-reset-submit">
                {loading ? "Сохраняем..." : "Установить новый пароль"}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}