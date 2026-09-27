import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      fontSizeStep: 0,
      highContrast: false,
      language: 'EN',
      setFontSizeStep: (step) =>
        set({ fontSizeStep: Math.max(-1, Math.min(1, step)) }),
      toggleHighContrast: () =>
        set((s) => ({ highContrast: !s.highContrast })),
      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: 'nawi_theme' }
  )
);
