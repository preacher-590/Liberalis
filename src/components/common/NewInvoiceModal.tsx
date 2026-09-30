import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Save } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';
import ClientSelector from './ClientSelector';

/**
 * Modal de création et édition de facture — Feat 2
 *
 * Gère la saisie multi-lignes (InvoiceLine) avec calcul automatique des totaux,
 * remises et acomptes réglés.
 *
 * Sections logiques :
 * 1. Gestion de l'état du formulaire et pré-remplissage en mode édition
 * 2. Manipulations de la grille des prestations (ajout, retrait, totaux)
 * 3. Envoi vers l'API (`POST /api/invoices` ou `PUT /api/invoices/{id}`)
 */
export default function NewInvoiceModal({ onClose, invoiceToEdit }: { onClose: () => void, invoiceToEdit?: any }) {
  const { user, clients, refreshInvoices, refreshDashboard } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    client_id: '',
    issued_at: new Date().toISOString().slice(0, 10),
    due_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'en_attente',
    discount: 0,
    amount_paid: 0,
    notes: '',
    payment_methods: ['Virement', 'Chèque', 'Mobile Money'],
    lines: [
      { description: 'Consultation Juridique', quantity: 1, unit_price: 50000 }
    ]
  });

  useEffect(() => {
    if (invoiceToEdit) {
      setFormData({
        client_id: invoiceToEdit.client_id || '',
        issued_at: (invoiceToEdit.issued_at || new Date().toISOString()).slice(0, 10),
        due_at: (invoiceToEdit.due_at || new Date().toISOString()).slice(0, 10),
        status: invoiceToEdit.status || 'en_attente',
        discount: parseFloat(invoiceToEdit.discount || 0),
        amount_paid: parseFloat(invoiceToEdit.amount_paid || 0),
        notes: invoiceToEdit.notes || '',
        payment_methods: invoiceToEdit.payment_methods || ['Virement', 'Chèque', 'Mobile Money'],
        // Use .lines (API response) or .items (alternative key)
        lines: (invoiceToEdit.lines || invoiceToEdit.items || []).length > 0
          ? (invoiceToEdit.lines || invoiceToEdit.items).map((i: any) => ({
              description: i.description,
              quantity: i.quantity,
              unit_price: parseFloat(i.unit_price),
            }))
          : [{ description: 'Consultation Juridique', quantity: 1, unit_price: 50000 }],
      });
    }
  }, [invoiceToEdit]);

  // Calcul des totaux en temps réel
  const subtotal = formData.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  const total = Math.max(0, subtotal - formData.discount);

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index)
      });
    }
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      setError('Veuillez sélectionner un client.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (invoiceToEdit) {
        await api.put(`/invoices/${invoiceToEdit.id}`, formData);
      } else {
        await api.post('/invoices', formData);
      }
      await refreshInvoices();
      await refreshDashboard();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la facture.');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!invoiceToEdit;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{isEditing ? 'Modifier Facture' : 'Nouvelle Facture'}</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{isEditing ? 'Mettre à jour le document' : 'Émettez un document professionnel'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/20 italic animate-in shake">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Client */}
            <ClientSelector 
              clients={clients} 
              selectedId={formData.client_id} 
              onSelect={(id) => setFormData({...formData, client_id: String(id)})}
              required
            />

            {/* Date Échéance */}
            <div className="space-y-1 sm:col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Échéance</label>
              <input
                type="date"
                value={formData.due_at}
                onChange={(e) => setFormData({...formData, due_at: e.target.value})}
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none"
              />
            </div>

            {/* Statut */}
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Statut de la facture</label>
              <div className="flex gap-3">
                {[
                  { value: 'en_attente', label: 'En attente', color: 'amber' },
                  { value: 'en_retard', label: 'En retard', color: 'red' },
                  { value: 'payee', label: 'Payée ✔', color: 'green' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: opt.value })}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all',
                      formData.status === opt.value
                        ? opt.color === 'green'
                          ? 'bg-green-500 border-green-500 text-white shadow-md'
                          : opt.color === 'red'
                          ? 'bg-red-500 border-red-500 text-white shadow-md'
                          : 'bg-amber-500 border-amber-500 text-white shadow-md'
                        : 'bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border text-gray-400 hover:border-gray-400'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Désignation des prestations</h3>
              <button 
                type="button" 
                onClick={addLine}
                className="text-[10px] font-black text-primary hover:text-primary-dark uppercase tracking-widest flex items-center gap-1"
              >
                <Plus size={14} /> Ajouter une ligne
              </button>
            </div>

            <div className="space-y-3">
              {formData.lines.map((line, idx) => (
                <div key={idx} className="flex gap-3 group animate-in slide-in-from-left-2 duration-200">
                  <input
                    required
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    placeholder="E.g. Rédaction d'acte"
                    className="flex-1 bg-gray-50 dark:bg-dark-bg border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none"
                  />
                  <input
                    required
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                    className="w-16 bg-gray-50 dark:bg-dark-bg border-none rounded-xl px-2 py-3 text-sm font-bold text-center text-gray-900 dark:text-white outline-none"
                  />
                  <div className="relative w-32">
                    <input
                      required
                      type="number"
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, 'unit_price', Number(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-xl pl-3 pr-8 py-3 text-sm font-bold text-right text-gray-900 dark:text-white outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">
                      {user?.currency === 'FCFA' ? 'F' : (user?.currency || 'FCFA')}
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeLine(idx)}
                    className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4">
            {/* Notes Section */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-primary">Notes / Conditions</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Conditions de règlement..."
                className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none resize-none"
              />
            </div>

            {/* Totals Section */}
            <div className="bg-gray-50 dark:bg-dark-bg/50 rounded-3xl p-6 space-y-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-xs font-bold uppercase">Sous-total</span>
                <span className="font-extrabold">{subtotal.toLocaleString('fr-FR')} {user?.currency || 'FCFA'}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-xs font-bold uppercase">Réduction</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={formData.discount} 
                    onChange={(e) => setFormData({...formData, discount: Number(e.target.value)})}
                    className="w-24 bg-white dark:bg-dark-surface rounded-xl text-right px-3 py-2 text-xs font-black border border-gray-100 dark:border-dark-border outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-white"
                  />
                  <span className="text-[10px] font-bold">{user?.currency === 'FCFA' ? 'F' : (user?.currency || 'FCFA')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-primary font-bold">
                <span className="text-xs uppercase">Total Facturé</span>
                <span className="text-sm font-black tracking-tight">{total.toLocaleString('fr-FR')} {user?.currency || 'FCFA'}</span>
              </div>

              <div className="flex items-center justify-between text-amber-600 dark:text-amber-500">
                <span className="text-xs font-bold uppercase">Acompte / Payé</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={formData.amount_paid} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      // Clamp to total to prevent overpayment in UI
                      setFormData({...formData, amount_paid: val > total ? total : val});
                    }}
                    className={clsx(
                      "w-24 bg-white dark:bg-dark-surface rounded-xl text-right px-3 py-2 text-xs font-black outline-none focus:ring-2 transition-all text-gray-900 dark:text-white",
                      formData.amount_paid > total ? "border-red-500 ring-red-500/20" : "border-amber-200 dark:border-amber-900/40 focus:ring-amber-500/20"
                    )}
                  />
                  <span className="text-[10px] font-bold">{user?.currency || 'FCFA'}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-dark-border pt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Solde restant</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter mt-1">Net à payer</span>
                </div>
                <span className={clsx("text-xl font-black transition-colors", (total - formData.amount_paid) > 0 ? "text-primary" : "text-green-500")}>
                  {Math.max(0, total - formData.amount_paid).toLocaleString('fr-FR')} {user?.currency || 'FCFA'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
                isEditing ? <><Save size={16} /> Enregistrer la facture</> : <><FileText size={16} /> Émettre la facture</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


