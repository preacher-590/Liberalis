import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Plus, DollarSign, Save, Mail } from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';
import ClientSelector from './ClientSelector';

/**
 * Modal de création et édition de rendez-vous — Feat 6
 */
export default function NewAppointmentModal({ onClose, appointmentToEdit }: { onClose: () => void, appointmentToEdit?: any }) {
  const { clients, refreshAppointments, refreshDashboard } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Définit une heure par défaut (prochain créneau arrondi)
  const defaultStartsAt = new Date();
  defaultStartsAt.setMinutes(0, 0, 0);
  defaultStartsAt.setHours(defaultStartsAt.getHours() + 1);
  const formatDateForInput = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    client_id: '',
    type: 'Consultation Juridique',
    starts_at: formatDateForInput(defaultStartsAt),
    duration_minutes: 30,
    amount: 50000,
    notes: '',
    send_email_reminder: true
  });

  useEffect(() => {
    if (appointmentToEdit) {
      setFormData({
        client_id: appointmentToEdit.client_id || '',
        type: appointmentToEdit.type || 'Consultation Juridique',
        starts_at: appointmentToEdit.starts_at ? formatDateForInput(new Date(appointmentToEdit.starts_at)) : formatDateForInput(defaultStartsAt),
        duration_minutes: appointmentToEdit.duration_minutes || 30,
        amount: appointmentToEdit.amount || 50000,
        notes: appointmentToEdit.notes || '',
        send_email_reminder: appointmentToEdit.send_email_reminder !== undefined ? appointmentToEdit.send_email_reminder : true
      });
    }
  }, [appointmentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      setError('Veuillez sélectionner un client.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (appointmentToEdit) {
        await api.put(`/appointments/${appointmentToEdit.id}`, formData);
      } else {
        await api.post('/appointments', formData);
      }
      await refreshAppointments();
      await refreshDashboard();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du rendez-vous.');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!appointmentToEdit;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{isEditing ? 'Modifier Rendez-vous' : 'Nouveau Rendez-vous'}</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Planification & E-mail Automatique</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/20 italic animate-in shake">
              {error}
            </div>
          )}

          {/* Client Selection */}
          <ClientSelector 
            clients={clients} 
            selectedId={formData.client_id} 
            onSelect={(id) => setFormData({...formData, client_id: String(id)})}
            required
            label="Client concerné"
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Starts At */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar size={12} /> Date et Heure
              </label>
              <input
                required
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData({...formData, starts_at: e.target.value})}
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12} /> Durée (minutes)
              </label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 heure</option>
                <option value={90}>1h 30m</option>
                <option value={120}>2 heures</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">Nature du RDV</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                placeholder="Ex: Consultation, Suivi..."
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <DollarSign size={12} className="text-green-500" /> Montant (FCFA)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes internes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Précisions sur le dossier..."
              className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none resize-none"
            />
          </div>

          {/* Email Reminder - Feat 6 */}
          <div className="bg-primary/5 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-bg flex items-center justify-center text-primary shadow-sm border border-primary/10">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white">Rappel automatique</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Envoyé 24h avant le RDV</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.send_email_reminder} 
                onChange={(e) => setFormData({...formData, send_email_reminder: e.target.checked})}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-inter"
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
                isEditing ? <><Save size={16} /> Enregistrer</> : <><Plus size={16} /> Planifier le RDV</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


