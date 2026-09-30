import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RestrictedModuleProps {
  moduleName: string;
}

/**
 * Composant d'affichage pour les modules désactivés par le Super Admin.
 *
 * S'affiche lorsqu'un utilisateur pro tente d'accéder par URL directe à une page
 * dont le menu lui a été retiré dans ses permissions d'accès.
 */
export default function RestrictedModule({ moduleName }: RestrictedModuleProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm min-h-[400px] text-center max-w-lg mx-auto my-12 animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
        Module non activé
      </h2>
      <p className="text-gray-500 font-medium text-sm mt-3 leading-relaxed">
        L'accès au module <span className="font-bold text-gray-900 dark:text-white">« {moduleName} »</span> n'est pas activé sur votre compte professionnel.
      </p>
      <p className="text-gray-400 text-xs mt-2 leading-relaxed">
        Le Super Administrateur de la plateforme gère la disponibilité des fonctionnalités selon votre formule d'abonnement.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-8 flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition-all"
      >
        <ArrowLeft size={16} /> Retour au tableau de bord
      </button>
    </div>
  );
}
