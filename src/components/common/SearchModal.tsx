import { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, Calendar, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

/**
 * Modal de Recherche Globale — Feat 4
 *
 * Déclenchée par Ctrl+K (ou Cmd+K) ou par clic sur la barre de recherche.
 * Effectue des recherches en temps réel dans les clients, factures et RDV.
 */
export default function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    clients: any[];
    invoices: any[];
    appointments: any[];
  }>({ clients: [], invoices: [], appointments: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus automatique à l'ouverture
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Débounce la recherche pour éviter trop d'appels API
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ clients: [], invoices: [], appointments: [] });
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/search', { params: { q: query } });
        setResults(data);
      } catch (err) {
        console.error('Erreur recherche:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Fermeture sur Touche Échap
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Area */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-100 dark:border-dark-border">
          <Search size={24} className="text-primary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client, une facture, un RDV..."
            className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          <div className="flex items-center gap-2">
            {loading && (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[500px] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-primary" />
              </div>
              <p className="text-gray-900 dark:text-white font-extrabold">Commencez à taper...</p>
              <p className="text-sm text-gray-500 mt-1">Recherche rapide dans toute votre plateforme.</p>
              <div className="mt-6 flex justify-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-bold text-gray-500">↑↓ Naviguer</kbd>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-bold text-gray-500">⏎ Valider</kbd>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-bold text-gray-500">ESC Fermer</kbd>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {/* Clients Section */}
              {results.clients.length > 0 && (
                <section>
                  <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400">Clients</h3>
                  {results.clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleNavigate(`/clients?id=${client.id}`)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold transition-transform group-hover:scale-110">
                        <User size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 dark:text-white capitalize">{client.first_name} {client.last_name}</p>
                        <p className="text-xs text-gray-500">{client.phone} • {client.ref_number}</p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* Invoices Section */}
              {results.invoices.length > 0 && (
                <section>
                  <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400">Factures</h3>
                  {results.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => handleNavigate(`/factures?id=${inv.id}`)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-extrabold transition-transform group-hover:scale-110">
                        <FileText size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 dark:text-white uppercase">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{Number(inv.total).toLocaleString('fr-FR')} FCFA • {inv.status}</p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* Appointments Section */}
              {results.appointments.length > 0 && (
                <section>
                  <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400">Rendez-vous</h3>
                  {results.appointments.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => handleNavigate(`/agenda?id=${apt.id}`)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-extrabold transition-transform group-hover:scale-110">
                        <Calendar size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 dark:text-white">{apt.type}</p>
                        <p className="text-xs text-gray-500">{apt.client?.last_name} • {new Date(apt.starts_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* Empty state when searching but no results */}
              {!loading && results.clients.length === 0 && results.invoices.length === 0 && results.appointments.length === 0 && (
                <div className="p-10 text-center">
                  <p className="text-gray-400 font-bold italic">Aucun résultat trouvé pour "{query}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-dark-bg/50 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px]">
            <span className="flex items-center gap-1 border border-gray-200 dark:border-dark-border px-1 rounded-md bg-white dark:bg-dark-surface">
              <Command size={10} /> K
            </span>
            <span>Raccourci rapide</span>
          </div>
          <p className="text-[10px] font-black text-primary uppercase">Libéralis Search</p>
        </div>
      </div>
    </div>
  );
}


