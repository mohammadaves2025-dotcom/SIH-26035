import { create } from 'zustand';

let toastId = 0;

export const useNotificationStore = create((set) => ({
  toasts: [],
  addToast: ({ type = 'info', message, code, duration = 5000 }) => {
    const id = ++toastId;
    set((s) => ({
      toasts: [...s.toasts, { id, type, message, code }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
