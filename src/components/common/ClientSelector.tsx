import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, User, Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface ClientSelectorProps {
  clients: any[];
  selectedId: string | number;
  onSelect: (id: string | number) => void;
  required?: boolean;
  label?: string;
}

/**
 * Composant ClientSelector — Dropdown de sélection avec recherche de client
 *
 * Permet de chercher et sélectionner un client dans un menu déroulant dynamique.
 * Utilisé dans les modales de création de RDV et de facture.
 */
export default function ClientSelector({ clients, selectedId, onSelect, label = "Client" }: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedClient = useMemo(() => 
    clients.find(c => String(c.id) === String(selectedId)),
    [clients, selectedId]
  );

  const filteredClients = useMemo(() => {
    if (!search) return clients.slice(0, 10); // Show first 10 when not searching
    const q = search.toLowerCase();
    return clients.filter(c => 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.ref_number && c.ref_number.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 10); // Limit results for performance
  }, [clients, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-1 relative" ref={wrapperRef}>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
        <User size={12} className="text-primary" /> {label}
      </label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold flex items-center justify-between cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary/20",
          selectedClient ? "text-gray-900 dark:text-white" : "text-gray-400"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {selectedClient ? (
            <>
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
              </div>
              <span className="truncate">{selectedClient.first_name} {selectedClient.last_name}</span>
              <span className="text-[10px] text-gray-500 font-bold hidden sm:inline">({selectedClient.ref_number})</span>
            </>
          ) : (
            "Sélectionner un client..."
          )}
        </div>
        <ChevronDown size={16} className={clsx("text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-2xl z-[80] overflow-hidden animate-in slide-in-from-top-2">
          <div className="p-3 border-b border-gray-100 dark:border-dark-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (Nom, Réf, Tél...)"
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-[10px] font-bold text-gray-500 uppercase">Aucun résultat</div>
            ) : (
              filteredClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => {
                    onSelect(client.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={clsx(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors group",
                    String(selectedId) === String(client.id) 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                      String(selectedId) === String(client.id) ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 group-hover:bg-white dark:group-hover:bg-gray-600"
                    )}>
                      {client.first_name?.[0]}{client.last_name?.[0]}
                    </div>
                    <div className="truncate">
                      <p className="font-black text-xs leading-none">{client.first_name} {client.last_name}</p>
                      <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-tight">{client.ref_number} · {client.phone}</p>
                    </div>
                  </div>
                  {String(selectedId) === String(client.id) && <Check size={14} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


