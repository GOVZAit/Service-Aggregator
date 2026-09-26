import { useEffect, useRef, useState } from "react";
import * as Alert from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
export function useAdminConfirm() {
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const finish = (value: boolean) => { resolver.current?.(value); resolver.current = null; setMessage(null); };
  useEffect(() => () => { resolver.current?.(false); }, []);
  const confirm = (text: string) => new Promise<boolean>(resolve => {
    resolver.current?.(false); resolver.current = resolve;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMessage(text);
  });
  const dialog = <Alert.Root open={message !== null} onOpenChange={open => { if (!open) finish(false); }}><Alert.Portal>
    <Alert.Overlay className="admin-confirm-overlay" />
    <Alert.Content className="admin-confirm-content" onCloseAutoFocus={e => { if (opener.current?.isConnected) { e.preventDefault(); opener.current.focus(); } }}>
      <Alert.Title className="text-lg font-bold">Подтвердите действие</Alert.Title><Alert.Description className="my-4 text-sm leading-relaxed text-muted-foreground">{message}</Alert.Description>
      <div className="flex flex-wrap justify-end gap-2"><Alert.Cancel asChild><Button type="button" variant="outline" onClick={() => finish(false)}>Отмена</Button></Alert.Cancel><Alert.Action asChild><Button type="button" onClick={() => finish(true)}>Подтвердить</Button></Alert.Action></div>
    </Alert.Content></Alert.Portal></Alert.Root>;
  return { confirm, dialog };
}
