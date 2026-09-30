import { useState, useCallback } from 'react';
import api from '../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CompteMobileMoney {
  id: number;
  user_id: number;
  operateur: string;
  numero: string;
  code_ussd: string | null;
  est_actif: boolean;
  initiales: string;
  couleur_avatar: string;
  created_at: string;
  updated_at: string;
}

export interface CompteFormData {
  id?: number;
  operateur: string;
  numero: string;
  code_ussd: string | null;
  est_actif: boolean;
}

interface ActionResult {
  success: boolean;
  message: string;
}

// ─── Helpers pour les messages d'erreur Laravel ────────────────────────────────

function parseApiError(err: any): string {
  const status = err?.response?.status;
  const data   = err?.response?.data;

  if (status === 422 && data?.errors) {
    const firstField = Object.values(data.errors)[0] as string[];
    return firstField?.[0] ?? 'Les données saisies sont invalides.';
  }
  if (status === 403) return 'Action non autorisée.';
  if (status === 404) return 'Compte introuvable.';
  if (status === 409 || data?.message?.includes('Duplicate')) {
    return 'Vous avez déjà un compte pour cet opérateur.';
  }
  return data?.message ?? 'Une erreur inattendue est survenue.';
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useCompteMobileMoney() {
  const [comptes, setComptes]           = useState<CompteMobileMoney[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── GET /api/comptes-mobile-money ─────────────────────────────────────────
  const fetchComptes = useCallback(async (): Promise<ActionResult> => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/comptes-mobile-money');
      setComptes(data.data ?? []);
      return { success: true, message: data.message ?? 'Comptes chargés.' };
    } catch (err: any) {
      return { success: false, message: parseApiError(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── POST /api/comptes-mobile-money ────────────────────────────────────────
  const creerCompte = useCallback(
    async (payload: CompteFormData): Promise<ActionResult> => {
      setIsSubmitting(true);
      try {
        const { data } = await api.post('/comptes-mobile-money', payload);
        setComptes((prev) => [...prev, data.data]);
        return { success: true, message: data.message ?? 'Compte créé avec succès.' };
      } catch (err: any) {
        return { success: false, message: parseApiError(err) };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // ── PUT /api/comptes-mobile-money/{id} ────────────────────────────────────
  const modifierCompte = useCallback(
    async (id: number, payload: CompteFormData): Promise<ActionResult> => {
      setIsSubmitting(true);
      try {
        const { data } = await api.put(`/comptes-mobile-money/${id}`, payload);
        setComptes((prev) =>
          prev.map((c) => (c.id === id ? data.data : c))
        );
        return { success: true, message: data.message ?? 'Compte mis à jour.' };
      } catch (err: any) {
        return { success: false, message: parseApiError(err) };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // ── PATCH /api/comptes-mobile-money/{id}/toggle ───────────────────────────
  const toggleActif = useCallback(
    async (id: number): Promise<ActionResult> => {
      setIsSubmitting(true);
      try {
        const { data } = await api.patch(`/comptes-mobile-money/${id}/toggle`);
        setComptes((prev) =>
          prev.map((c) => (c.id === id ? data.data : c))
        );
        return { success: true, message: data.message ?? 'Statut mis à jour.' };
      } catch (err: any) {
        return { success: false, message: parseApiError(err) };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // ── DELETE /api/comptes-mobile-money/{id} ─────────────────────────────────
  const supprimerCompte = useCallback(
    async (id: number): Promise<ActionResult> => {
      setIsSubmitting(true);
      try {
        const { data } = await api.delete(`/comptes-mobile-money/${id}`);
        setComptes((prev) => prev.filter((c) => c.id !== id));
        return { success: true, message: data.message ?? 'Compte supprimé.' };
      } catch (err: any) {
        return { success: false, message: parseApiError(err) };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    comptes,
    isLoading,
    isSubmitting,
    fetchComptes,
    creerCompte,
    modifierCompte,
    toggleActif,
    supprimerCompte,
  };
}
