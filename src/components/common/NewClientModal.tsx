import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Briefcase, Plus, Save } from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

/**
 * Modal de création et d'édition de client — Feat 5 / 8
 */
export default function NewClientModal({ onClose, clientToEdit }: { onClose: () => void, clientToEdit?: any }) {
  const { refreshClients, refreshDashboard } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    profession: '',
    address: '',
    notes: '',
    status: 'ACTIF'
  });

  useEffect(() => {
    if (clientToEdit) {
      setFormData({
        first_name: clientToEdit.first_name || '',
        last_name: clientToEdit.last_name || '',
        phone: clientToEdit.phone || '',
        email: clientToEdit.email || '',
        profession: clientToEdit.profession || '',
        address: clientToEdit.address || '',
        notes: clientToEdit.notes || '',
        status: (clientToEdit.status || 'ACTIF').toUpperCase()
      });
    }
  }, [clientToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        status: formData.status.toLowerCase()
      };

      if (clientToEdit) {
        await api.put(`/clients/${clientToEdit.id}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      await refreshClients();
      await refreshDashboard();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'enregistrement du client.');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!clientToEdit;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{isEditing ? 'Modifier Client' : 'Nouveau Client'}</h2>
              <p className="text-xs text-gray-500">{isEditing ? 'Mettez à jour les informations du dossier.' : 'Ajoutez un nouveau dossier à votre base.'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-500 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/20 italic">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Prénom</label>
              <div className="relative">
                <input 
                  required
                  type="text" 
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  placeholder="Jean" 
                  className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Nom</label>
              <input 
                required
                type="text" 
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value.toLocaleUpperCase()})}
                placeholder="Dupont" 
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 text-primary">Téléphone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
                <input 
                  required
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+221 77 ..." 
                  className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="jean.dupont@email.com" 
                  className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Profession / Secteur</label>
            <div className="relative">
              <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                type="text" 
                value={formData.profession}
                onChange={(e) => setFormData({...formData, profession: e.target.value})}
                placeholder="Entrepreneur, Salarié, etc." 
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Statut Client</label>
            <div className="flex gap-2">
              {['ACTIF', 'NOUVEAU', 'INACTIF'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({...formData, status: s})}
                  className={`flex-1 py-2 text-[10px] font-black rounded-xl border transition-all ${
                    formData.status === s 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-gray-50 dark:bg-dark-bg border-gray-100 dark:border-dark-border text-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isEditing ? <><Save size={16} /> Enregistrer les modifications</> : <><Plus size={16} /> Créer le client</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


