import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

/**
 * Context ThemeProvider — Gestion centralisée du thème Clair / Sombre / Système
 *
 * Gère de manière synchrone et réactive :
 * 1. L'application de la classe CSS `.dark` sur `<html>`
 * 2. L'attribut CSS `color-scheme` pour les barres de défilement et contrôles natifs
 * 3. La détection et l'écoute des préférences OS (`prefers-color-scheme: dark`)
 * 4. La persistance sécurisée dans `localStorage`
 */
export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Récupération sécurisée du thème persisté ou valeur par défaut 'system'
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
      return 'system';
    } catch {
      return 'system';
    }
  });

  // Détection réactive de la préférence système
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Résolution finale du mode sombre (booléen)
  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark);

  // Application immédiate et persistante sur le DOM HTML
  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('Impossible de sauvegarder le thème dans localStorage:', e);
    }

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme, isDark]);

  // Écoute dynamique des changements de thème au niveau du système d'exploitation
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Définition explicite d'un mode ('light', 'dark', 'system')
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  // Bascule rapide entre Clair et Sombre
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      // Si on était en mode système, on bascule vers l'opposé de l'état système actuel
      return systemIsDark ? 'light' : 'dark';
    });
  }, [systemIsDark]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

