interface WelcomeEmail {
  to: string;
  login: string;
}

interface PasswordResetEmail {
  to: string;
  login: string;
  resetPath: string;
}

export const emailDeliveryConfigured = false;

/**
 * Delivery is intentionally disabled until a transactional email provider is
 * connected. Passwords are never accepted by or sent through this module.
 */
export async function sendWelcomeEmail(_message: WelcomeEmail): Promise<boolean> {
  return false;
}

export async function sendPasswordResetEmail(_message: PasswordResetEmail): Promise<boolean> {
  return false;
}