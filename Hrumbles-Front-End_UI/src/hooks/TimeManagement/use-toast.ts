
import { useState } from "react";

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export type Toast = ToastProps & {
  id: string;
  action?: React.ReactNode;
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...props, id };
    setToasts((prev) => [...prev, newToast]);
    console.log("Toast:", props);
    return { id };
  };

  return {
    toasts,
    toast
  };
};

export const toast = (props: ToastProps) => {
  console.log("Toast:", props);
};
