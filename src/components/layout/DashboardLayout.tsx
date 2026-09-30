import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ConnectivityBanner from '../common/ConnectivityBanner';
import SearchModal from '../common/SearchModal';
import NewClientModal from '../common/NewClientModal';
import NewAppointmentModal from '../common/NewAppointmentModal';
import NewInvoiceModal from '../common/NewInvoiceModal';

/**
 * DashboardLayout — Structure principale de l'application connectée.
 */
export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // États des Modals Globales (Feats 5, 6, 2)
  const [activeModal, setActiveModal] = useState<'client' | 'appointment' | 'invoice' | null>(null);

  // Raccourci clavier Cmd+K / Ctrl+K pour la recherche globale (Feat 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-background-secondary dark:bg-dark-bg transition-colors duration-300">
      {/* Sidebar Responsive (Overlay sur mobile) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col relative w-full">
        {/* Bannière de connectivité hors-ligne & synchronisation */}
        <ConnectivityBanner />

        <Topbar 
          onOpenSidebar={() => setIsSidebarOpen(true)} 
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenModal={(type) => setActiveModal(type)}
        />
        
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* --- MODALS GLOBALES --- */}

      {/* Recherche (Feat 4) */}
      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}

      {/* Création Client (Feat 5) */}
      {activeModal === 'client' && <NewClientModal onClose={() => setActiveModal(null)} />}

      {/* Planification RDV (Feat 6) */}
      {activeModal === 'appointment' && <NewAppointmentModal onClose={() => setActiveModal(null)} />}

      {/* Émission Facture (Feat 2) */}
      {activeModal === 'invoice' && <NewInvoiceModal onClose={() => setActiveModal(null)} />}

      {/* Overlay Mobile pour la Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

