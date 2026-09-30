import { useState, useEffect } from 'react';

/**
 * Hook useOfflineMode — Détection de la connectivité et mode hors-ligne
 *
 * Écoute la connectivité réseau du navigateur (`navigator.onLine`)
 * et gère le basculement manuel du mode hors-ligne stocké dans localStorage.
 */
export function useOfflineMode() {
  const [isOfflineEnabled, setIsOfflineEnabled] = useState(() => {
    return localStorage.getItem("liberalis-offline") === "true";
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleOfflineMode = () => {
    const next = !isOfflineEnabled;
    setIsOfflineEnabled(next);
    localStorage.setItem("liberalis-offline", String(next));
  };

  return { isOfflineEnabled, toggleOfflineMode, isOnline };
}
