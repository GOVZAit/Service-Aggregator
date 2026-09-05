import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, AtSign, Lock, User, ArrowLeft, Briefcase, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";
import { registerSchema, loginSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import type { UserRole } from "@shared/schema";

const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, "Повторите пароль") })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type Tab = "login" | "register";

export default function AuthPage() {
  const search = useSearch();
  const initialTab: Tab = search.includes("tab=register") ? "register" : "login";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [, navigate] = useLocation();
  const { login, register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("client");

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", identifier: "", password: "", confirmPassword: "", role: "client" as UserRole },
  });

  const onLogin = async (values: { identifier: string; password: string }) => {
    setError("");
    try {
      const loggedUser = await login(values.identifier, values.password);
      navigate(loggedUser.role === "master" ? "/master" : "/profile");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onRegister = async (values: { name: string; identifier: string; password: string }) => {
    setError("");
    try {
      const newUser = await register(values.name, values.identifier, values.password, selectedRole);
      navigate(newUser.role === "master" ? "/master/onboarding" : "/profile");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-12 pb-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground mb-8"
          data-testid="button-back-auth"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">На главную</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">995</h1>
          <p className="text-muted-foreground text-sm">Сервисы и мастера Грозного</p>
        </div>

        <div className="flex bg-muted rounded-2xl p-1">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            data-testid="tab-login"
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              tab === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Вход
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            data-testid="tab-register"
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              tab === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Регистрация
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 max-w-lg mx-auto w-full">
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        {/* LOGIN */}
        {tab === "login" && (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон или email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} inputMode="email" placeholder="+7 999 000-00-00 или name@mail.ru" className="pl-9" data-testid="input-login-identifier" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Введите пароль"
                          className="pl-9 pr-10"
                          data-testid="input-login-password"
                        />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="block ml-auto text-sm font-medium text-primary"
                data-testid="button-forgot-password"
              >
                Забыли пароль?
              </button>
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold mt-2"
                disabled={loginForm.formState.isSubmitting}
                data-testid="button-login-submit"
              >
                {loginForm.formState.isSubmitting ? "Входим..." : "Войти"}
              </Button>
            </form>
          </Form>
        )}

        {/* REGISTER */}
        {tab === "register" && (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">

              {/* Role selector */}
              <div>
                <p className="text-sm font-medium mb-2">Я регистрируюсь как</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("client")}
                    data-testid="role-client"
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                      selectedRole === "client"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <UserRound className={cn("w-6 h-6", selectedRole === "client" ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-sm font-semibold", selectedRole === "client" ? "text-primary" : "text-foreground")}>Клиент</p>
                      <p className="text-xs text-muted-foreground">Ищу мастера</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("master")}
                    data-testid="role-master"
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                      selectedRole === "master"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <Briefcase className={cn("w-6 h-6", selectedRole === "master" ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-sm font-semibold", selectedRole === "master" ? "text-primary" : "text-foreground")}>Исполнитель</p>
                      <p className="text-xs text-muted-foreground">Выполняю заказы</p>
                    </div>
                  </button>
                </div>
              </div>

              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="Ваше имя" className="pl-9" data-testid="input-register-name" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон или email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} inputMode="email" placeholder="+7 999 000-00-00 или name@mail.ru" className="pl-9" data-testid="input-register-identifier" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Минимум 6 символов"
                          className="pl-9 pr-10"
                          data-testid="input-register-password"
                        />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Повторите пароль</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type={showConfirm ? "text" : "password"}
                          placeholder="Повторите пароль"
                          className="pl-9 pr-10"
                          data-testid="input-register-confirm"
                        />
                        <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold mt-2"
                disabled={registerForm.formState.isSubmitting}
                data-testid="button-register-submit"
              >
                {registerForm.formState.isSubmitting
                  ? "Регистрируем..."
                  : selectedRole === "master"
                  ? "Зарегистрироваться как исполнитель"
                  : "Создать аккаунт"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Для аккаунта с email после подключения почтовой отправки придёт письмо с логином. Сам пароль в письмах не отправляется.
              </p>
            </form>
          </Form>
        )}

        <p className="text-xs text-center text-muted-foreground mt-6 pb-10">
          Продолжая, вы соглашаетесь с условиями использования сервиса 995
        </p>
      </main>
    </div>
  );
}
