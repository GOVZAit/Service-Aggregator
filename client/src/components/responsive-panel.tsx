import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** A single modal surface: bottom sheet on phones, side panel on larger screens. */
export function ResponsivePanel({ open, onOpenChange, title, description, children, footer }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [viewport, setViewport] = useState<CSSProperties>({});
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const vv = window.visualViewport;
    const sync = () => {
      // Do not reposition the panel while the user is pinch-zooming.
      if (Math.abs(vv.scale - 1) > 0.05) return;
      setViewport({
        "--panel-viewport": `${vv.height}px`,
        "--panel-keyboard": `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
      } as CSSProperties);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => { vv.removeEventListener("resize", sync); vv.removeEventListener("scroll", sync); };
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="govza-panel-overlay" />
        <Dialog.Content className="govza-panel" style={viewport}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            heading.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); }
          }}>
          <div className="govza-panel-heading">
            <div className="min-w-0">
              <Dialog.Title ref={heading} tabIndex={-1}>{title}</Dialog.Title>
              <Dialog.Description className={description ? "" : "sr-only"}>{description || title}</Dialog.Description>
            </div>
            <Dialog.Close className="directory-icon-button" aria-label="Закрыть панель"><X aria-hidden="true" size={20} /></Dialog.Close>
          </div>
          <div className="govza-panel-body">{children}</div>
          {footer && <div className="govza-panel-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
