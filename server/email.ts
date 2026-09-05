interface WelcomeEmail {
  to: string;
  login: string;
}

interface PasswordResetEmail {
  to: string;
  login: string;
  resetPath: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "995 <onboarding@resend.dev>";

export const emailDeliveryConfigured = Boolean(resendApiKey);
const publicAppUrl = (() => {
  if (!process.env.PUBLIC_APP_URL) return undefined;
  try {
    const url = new URL(process.env.PUBLIC_APP_URL);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
})();
export const passwordResetDeliveryConfigured = emailDeliveryConfigured && Boolean(publicAppUrl);

async function deliverEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resendApiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: emailFrom, to: [to], subject, html }),
    });

    if (!response.ok) {
      console.error("Email provider rejected delivery", {
        status: response.status,
        type: "provider_rejection",
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email provider request failed", {
      type: error instanceof Error ? error.name : "unknown_error",
    });
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendWelcomeEmail(message: WelcomeEmail): Promise<boolean> {
  const login = escapeHtml(message.login);
  return deliverEmail(
    message.to,
    "Аккаунт 995 создан",
    `<p>Ваш аккаунт в сервисе 995 успешно создан.</p>
     <p>Логин для входа: <strong>${login}</strong></p>
     <p>Пароль хранится только у вас и никогда не отправляется по почте.</p>`,
  );
}

export async function sendPasswordResetEmail(message: PasswordResetEmail): Promise<boolean> {
  if (!publicAppUrl) {
    console.error("Password reset email is disabled: PUBLIC_APP_URL must be a valid HTTPS origin");
    return false;
  }
  const login = escapeHtml(message.login);
  const resetUrl = escapeHtml(new URL(message.resetPath, publicAppUrl).toString());
  return deliverEmail(
    message.to,
    "Восстановление доступа к 995",
    `<p>Для аккаунта <strong>${login}</strong> запрошено восстановление доступа.</p>
     <p><a href="${resetUrl}">Задать новый пароль</a></p>
     <p>Если это были не вы, проигнорируйте письмо.</p>`,
  );
}