import { UserPlus, CalendarDays, FilePlus, Zap, MessageSquare } from 'lucide-react';

interface QuickActionMenuProps {
  onAction: (action: 'client' | 'appointment' | 'invoice') => void;
  onClose: () => void;
}

/**
 * Menu d'actions rapides — S'affiche sous le bouton "Nouveau" de la Topbar.
 */
export default function QuickActionMenu({ onAction, onClose }: QuickActionMenuProps) {
  const actions = [
    { 
      id: 'client', 
      label: 'Nouveau Client', 
      desc: 'Dossier, contact, notes', 
      icon: UserPlus, 
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
    },
    { 
      id: 'appointment', 
      label: 'Nouveau Rendez-vous', 
      desc: 'Agenda & Rappel E-mail', 
      icon: CalendarDays, 
      color: 'bg-primary/10 text-primary dark:bg-primary/20' 
    },
    { 
      id: 'invoice', 
      label: 'Nouvelle Facture', 
      desc: 'Émission & Encaissement', 
      icon: FilePlus, 
      color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
    },
  ];

  return (
    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-dark-surface rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="p-4 border-b border-gray-50 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Zap size={10} className="text-primary" /> Création rapide
        </p>
      </div>
      
      <div className="p-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              onAction(action.id as any);
              onClose();
            }}
            className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-all group overflow-hidden"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${action.color}`}>
              <action.icon size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-gray-900 dark:text-white">{action.label}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{action.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 bg-primary/5 border-t border-gray-50 dark:border-dark-border flex items-center justify-between">
        <p className="text-[9px] font-black text-primary uppercase">Espace Professionnel</p>
        <MessageSquare size={14} className="text-primary/40" />
      </div>
    </div>
  );
}

