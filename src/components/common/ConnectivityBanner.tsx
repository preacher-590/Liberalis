import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { offlineStorage, SYNC_QUEUE_UPDATED_EVENT } from '../../services/offlineStorage';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

/**
 * ConnectivityBanner — Feat Hors-Ligne & En-Ligne
 *
 * Bannière sticky d'information de connectivité et de synchronisation.
 *
 * Rôles :
 * 1. Avertit en temps réel dès que la connexion réseau est coupée (navigator.onLine = false)
 *    ou lorsque l'utilisateur a forcé le mode hors-ligne dans ses paramètres.
 * 2. Compte et affiche le nombre de créations/modifications stockées localement en attente de synchronisation.
 * 3. Propose un déclenchement manuel immédiat de la synchronisation dès que le réseau est rétabli.
 */
export const ConnectivityBanner: React.FC = () => {
  const { isOnline, isOfflineEnabled } = useOfflineMode();
  const { refreshClients, refreshAppointments, refreshInvoices, refreshDashboard } = useApp();

  const [queueCount, setQueueCount] = useState<number>(() => offlineStorage.getQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Met à jour le compteur chaque fois que la file change
  useEffect(() => {
    const updateCount = () => {
      setQueueCount(offlineStorage.getQueue().length);
    };

    window.addEventListener(SYNC_QUEUE_UPDATED_EVENT, updateCount);
    return () => {
      window.removeEventListener(SYNC_QUEUE_UPDATED_EVENT, updateCount);
    };
  }, []);

  // Déclenche manuellement la synchronisation des données en attente
  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const { processed, failed, conflicts } = await offlineStorage.processSyncQueue(api);
      
      // Rafraîchit les entités globales pour charger les IDs finaux du serveur
      await Promise.all([
        refreshClients(),
        refreshAppointments(),
        refreshInvoices(),
        refreshDashboard(),
      ]);

      if (failed === 0 && conflicts === 0) {
        setLastSyncResult({
          success: true,
          message: `${processed} opération(s) synchronisée(s) avec succès.`,
        });
      } else if (conflicts > 0) {
        setLastSyncResult({
          success: false,
          message: `${processed} synchronisée(s), ${conflicts} conflit(s) détecté(s).`,
        });
      } else {
        setLastSyncResult({
          success: false,
          message: `${processed} synchronisée(s), ${failed} en attente.`,
        });
      }

      setQueueCount(offlineStorage.getQueue().length);
    } catch {
      setLastSyncResult({
        success: false,
        message: 'Erreur lors de la synchronisation.',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setLastSyncResult(null), 4000);
    }
  };

  // Ne rien afficher si l'utilisateur est connecté, n'a pas forcé le mode hors-ligne, et n'a aucune action en file
  if (isOnline && !isOfflineEnabled && queueCount === 0 && !lastSyncResult) {
    return null;
  }

  return (
    <aside
      role="alert"
      aria-live="polite"
      className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-md sticky top-0 z-50 border-b border-amber-700 dark:border-amber-800"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {!isOnline || isOfflineEnabled ? (
          <WifiOff className="w-4 h-4 text-amber-200 animate-pulse flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
        )}

        <div className="truncate">
          {!isOnline ? (
            <span>
              <strong className="font-bold">Mode Hors-ligne :</strong> Connexion Internet interrompue. Vos consultations et modifications restent accessibles en local.
            </span>
          ) : isOfflineEnabled ? (
            <span>
              <strong className="font-bold">Mode Hors-ligne forcé :</strong> Vos modifications sont enregistrées localement.
            </span>
          ) : (
            <span>
              <strong className="font-bold">Connexion rétablie :</strong> {queueCount} modification(s) prête(s) à être synchronisée(s).
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {queueCount > 0 && (
          <span className="bg-amber-900/60 text-amber-100 px-2.5 py-0.5 rounded-full border border-amber-400/30 text-[11px] font-mono">
            {queueCount} en attente
          </span>
        )}

        {lastSyncResult && (
          <span className={`text-[11px] px-2 py-0.5 rounded ${lastSyncResult.success ? 'bg-emerald-800 text-emerald-100' : 'bg-red-800 text-red-100'}`}>
            {lastSyncResult.message}
          </span>
        )}

        {isOnline && queueCount > 0 && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-amber-800 hover:bg-amber-50 active:scale-95 text-xs font-bold rounded-md shadow-sm transition-all disabled:opacity-50"
            title="Synchroniser immédiatement les données avec le serveur"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Envoi...' : 'Synchroniser'}</span>
            <ArrowUpRight className="w-3 h-3 opacity-70" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default ConnectivityBanner;
