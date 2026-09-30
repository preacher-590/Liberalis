import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Edit, MessageSquare, CalendarDays, Mail } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import NewAppointmentModal from '../components/common/NewAppointmentModal';
import ConfirmModal from '../components/common/ConfirmModal';
import api from '../services/api';
import WhatsAppActionModal from '../components/common/WhatsAppActionModal';
import { generateAppointmentReminderMessage } from '../services/whatsapp';

/**
 * Page Agenda Hebdomadaire (Agenda.tsx) — Feat 6
 *
 * Grille de rendez-vous intéractive par tranche horaire (7h - 19h).
 * Permet le déplacement par semaine, le filtrage par praticien, la gestion de statut
 * et la relance rapide par WhatsApp / Email.
 *
 * Sections logiques :
 * 1. Controls de navigation par semaine et saut à aujourd'hui
 * 2. Calcul du placement des blocs horaires selon l'heure de début et la durée
 * 3. Panneau latéral d'édition du statut et déclenchement des rappels
 * 4. Modale de programmation de nouveau RDV (`NewAppointmentModal`)
 */
const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7h to 19h

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmé':
      return 'bg-green-100 text-green-700 border-green-500 dark:bg-green-900/30 dark:text-green-400';
    case 'en attente':
    case 'en_attente':
      return 'bg-[#FAEEDA] text-[#854F0B] border-amber-500 dark:bg-amber-900/30 dark:text-amber-400';
    case 'en retard':
    case 'en_retard':
    case 'annulé':
      return 'bg-[#FCEBEB] text-[#A32D2D] border-red-500 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-blue-100 text-blue-700 border-blue-500 dark:bg-blue-900/30 dark:text-blue-400';
  }
};

export default function Agenda() {
  const { user, appointments, refreshAppointments } = useApp();
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // État de gestion de la modale de rappel WhatsApp interactive
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppData, setWhatsAppModalData] = useState<{
    recipientName: string;
    recipientPhone: string;
    message: string;
  }>({ recipientName: '', recipientPhone: '', message: '' });

  const handleDeleteAppointment = async () => {
    if (!selectedApt) return;
    await api.delete(`/appointments/${selectedApt.id}`);
    await refreshAppointments();
    setSelectedApt(null);
  };
  
  const [viewMode, setViewMode] = useState<'Jour' | 'Semaine' | 'Mois'>('Semaine');
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'Jour') d.setDate(d.getDate() - 1);
      else if (viewMode === 'Semaine') d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'Jour') d.setDate(d.getDate() + 1);
      else if (viewMode === 'Semaine') d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const displayDays = useMemo(() => {
    if (viewMode === 'Jour') {
      return [new Date(currentDate)];
    }
    if (viewMode === 'Semaine') {
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(currentDate);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      });
    }
    return []; // Handled separately in Month view
  }, [currentDate, viewMode]);

  const monthDays = useMemo(() => {
    if (viewMode !== 'Mois') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const emptyDaysCount = firstDay === 0 ? 6 : firstDay - 1; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: (Date | null)[] = Array.from({ length: emptyDaysCount }).fill(null) as null[];
    for (let i = 1; i <= daysInMonth; i++) {
       days.push(new Date(year, month, i));
    }
    while (days.length % 7 !== 0) {
       days.push(null);
    }
    return days;
  }, [currentDate, viewMode]);

  // Formate les jours pour l'affichage (ex: Lun 12)
  const daysHeader = displayDays.map(date => {
    const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
    return `${dayName} ${date.getDate()}`;
  });

  // Helper: formatted local date string for reliable day matching (avoids UTC shift)
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const parsedAppointments = useMemo(() => {
    return appointments.map(apt => {
      const d = new Date(apt.starts_at);
      // Use local-date string comparison to avoid UTC timezone off-by-one day bugs
      const aptDateStr = toLocalDateStr(d);
      const dayIndex = displayDays.findIndex(wd => toLocalDateStr(wd) === aptDateStr);
      const startHour = d.getHours() + d.getMinutes() / 60;
      const durationHours = (apt.duration_minutes ?? 60) / 60;
      // Clamp to visible range 7h–19h
      const clampedStart = Math.max(7, Math.min(19, startHour));
      const clampedEnd = Math.max(7, Math.min(19, startHour + durationHours));
      const clampedDuration = clampedEnd - clampedStart;
      return {
        ...apt,
        dayIndex,
        startHour,
        durationHours,
        clampedStart,
        clampedDuration,
        isOutOfRange: startHour >= 19 || (startHour + durationHours) <= 7,
      };
    }).filter(a => a.dayIndex !== -1 && !a.isOutOfRange && a.clampedDuration > 0);
  }, [appointments, displayDays]);

  const dateHeaderString = useMemo(() => {
    if (viewMode === 'Jour') {
      return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentDate);
    }
    if (viewMode === 'Mois') {
      return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate);
    }
    if (displayDays.length > 0) {
      const start = displayDays[0];
      const end = displayDays[displayDays.length - 1];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(end)}`;
      }
      return `${start.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(start)} - ${end.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(end)}`;
    }
    return '';
  }, [currentDate, viewMode, displayDays]);

  /**
   * Ouvre la modale interactive d'action WhatsApp pour le rappel de RDV.
   * Déclenche également en arrière-plan le rappel email sécurisé via l'API Laravel.
   */
  const handleOpenWhatsAppReminder = async () => {
    if (!selectedApt || !selectedApt.client) return;

    const d = new Date(selectedApt.starts_at);
    const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const location = user?.cabinet_name || user?.cabinet_address || 'Cabinet Libéralis';
    const practitioner = user?.name || '';
    const fullName = `${selectedApt.client.first_name} ${selectedApt.client.last_name}`.trim();

    const defaultMsg = generateAppointmentReminderMessage(
      fullName,
      dateStr,
      timeStr,
      location,
      practitioner
    );

    setWhatsAppModalData({
      recipientName: fullName,
      recipientPhone: selectedApt.client.phone || '',
      message: defaultMsg,
    });
    setIsWhatsAppModalOpen(true);

    // Déclenchement transparent du rappel côté backend (Email + WhatsApp payload)
    try {
      const res = await api.post(`/appointments/${selectedApt.id}/send-reminder`);
      if (res.data?.whatsapp_data?.raw_message) {
        setWhatsAppModalData(prev => ({
          ...prev,
          message: res.data.whatsapp_data.raw_message,
          recipientPhone: res.data.whatsapp_data.phone || prev.recipientPhone,
        }));
      }
    } catch (err) {
      console.warn('Notification email backend non jointe, utilisation du message généré localement :', err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in fade-in">
      <div className="flex-1 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border overflow-hidden flex flex-col shadow-sm relative">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-dark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="text-primary" /> Mon Agenda
            </h2>
            <div className="flex items-center bg-gray-50 dark:bg-dark-bg rounded-xl p-1 w-full sm:w-auto">
              <button 
                onClick={() => setViewMode('Jour')}
                className={clsx("flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-colors", viewMode === 'Jour' ? "bg-white dark:bg-dark-surface shadow-sm text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-900 dark:hover:text-white")}
              >Jour</button>
              <button 
                onClick={() => setViewMode('Semaine')}
                className={clsx("flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-colors", viewMode === 'Semaine' ? "bg-white dark:bg-dark-surface shadow-sm text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-900 dark:hover:text-white")}
              >Semaine</button>
              <button 
                onClick={() => setViewMode('Mois')}
                className={clsx("flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-colors", viewMode === 'Mois' ? "bg-white dark:bg-dark-surface shadow-sm text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-900 dark:hover:text-white")}
              >Mois</button>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
              <span className="text-[10px] uppercase tracking-widest font-black text-center text-gray-900 dark:text-white">
                {dateHeaderString}
              </span>
              <button onClick={handleNext} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"><ChevronRight size={16} /></button>
            </div>
            <button 
              onClick={() => { setAppointmentToEdit(null); setShowModal(true); }}
              className="bg-primary hover:bg-primary-hover active:scale-[0.98] text-white px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-black flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">RDV</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50/30 dark:bg-dark-bg/30 custom-scrollbar">
          {viewMode === 'Mois' ? (
            <div className="min-w-[800px] h-full flex flex-col p-4 bg-gray-50/50 dark:bg-dark-bg/10">
              <div className="grid grid-cols-7 gap-px rounded-t-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(d => (
                  <div key={d} className="bg-white dark:bg-dark-surface py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-dark-border">
                    {d}
                  </div>
                ))}
              </div>
              <div className={clsx("flex-1 grid grid-cols-7 gap-px rounded-b-xl overflow-hidden bg-gray-200 dark:bg-gray-700", monthDays.length > 35 ? "grid-rows-6" : "grid-rows-5")}>
                {monthDays.map((date, i) => {
                  if (!date) return <div key={i} className="bg-gray-50/50 dark:bg-dark-surface/50" />;
                  const dayApts = appointments.filter(a => {
                    const d = new Date(a.starts_at);
                    return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
                  });
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={i} 
                      className="bg-white dark:bg-dark-surface p-2 flex flex-col hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-h-[100px] cursor-pointer"
                      onClick={() => { setAppointmentToEdit(null); setShowModal(true); }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={clsx("text-xs font-black w-6 h-6 flex items-center justify-center rounded-xl", isToday ? "bg-primary text-white shadow-md shadow-primary/20" : "text-gray-900 dark:text-gray-300")}>
                          {date.getDate()}
                        </span>
                        {dayApts.length > 0 && (
                           <span className="text-[10px] text-gray-400 font-bold">{dayApts.length} RDV</span>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {dayApts.map(apt => (
                          <div 
                            key={apt.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }} 
                            className={clsx("text-[9px] truncate px-1.5 py-1 rounded-lg border", getStatusBadge(apt.status))}
                          >
                            <span className="font-bold mr-1">{new Date(apt.starts_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                            {apt.client.first_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="min-w-[800px] h-[832px] relative">
              <div className="grid h-full" style={{ gridTemplateColumns: `4rem repeat(${displayDays.length}, minmax(0, 1fr))` }}>
                {/* Ligne des Heures */}
                <div className="border-r border-gray-100 dark:border-dark-border/50 bg-white dark:bg-dark-surface sticky left-0 z-20 w-16 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                  <div className="h-14 border-b border-gray-100 dark:border-dark-border flex items-end justify-center pb-2">
                     <Clock size={14} className="text-gray-300 dark:text-gray-600" />
                  </div>
                  {hours.map(hour => (
                    <div key={hour} className="h-16 relative border-b border-gray-100/50 dark:border-dark-border/30">
                      <span className="absolute -top-2.5 right-2 text-[10px] font-black tracking-widest text-gray-400">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Jours */}
                <div className="grid relative" style={{ gridColumn: `span ${displayDays.length} / span ${displayDays.length}`, gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}>
                  {daysHeader.map((day, i) => (
                    <div key={day} className="border-r border-gray-100 dark:border-dark-border/50 relative">
                      <div className="h-14 border-b border-gray-100 dark:border-dark-border flex flex-col items-center justify-center sticky top-0 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md z-10">
                        <span className="text-[9px] uppercase font-black text-gray-400 tracking-widest">{day.split(' ')[0]}</span>
                        <span className={clsx("text-sm font-black mt-0.5 px-2 py-0.5 flex items-center justify-center rounded-xl", 
                          displayDays[i].toDateString() === new Date().toDateString()
                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                            : "text-gray-900 dark:text-white"
                        )}>
                          {day.split(' ')[1]}
                        </span>
                      </div>
                      {hours.map(hour => (
                        <div key={hour} className="h-16 border-b border-gray-100/50 dark:border-dark-border/30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => { setAppointmentToEdit(null); setShowModal(true); }}></div>
                      ))}
                    </div>
                  ))}
                  
                  {/* Rendez-vous Blocks */}
                  {parsedAppointments.map((apt) => (
                    <div 
                      key={apt.id} 
                      onClick={() => setSelectedApt(apt)}
                      className={clsx(
                        "absolute rounded-xl p-2 text-xs border-l-4 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02] flex flex-col z-10 overflow-hidden",
                        getStatusBadge(apt.status)
                      )}
                      style={{ 
                        top: `${56 + (apt.clampedStart - 7) * 64}px`, 
                        left: `${(apt.dayIndex / displayDays.length) * 100}%`, 
                        width: `calc(100% / ${displayDays.length} - 6px)`, 
                        height: `${Math.max(apt.clampedDuration * 64 - 4, 24)}px`,
                        marginLeft: '3px'
                      }}
                    >
                      <div className="font-black truncate text-xs leading-tight tracking-tight">{apt.client.first_name} {apt.client.last_name}</div>
                      <div className="font-bold opacity-80 truncate text-[10px] mt-0.5">{apt.type}</div>
                      {apt.clampedDuration >= 0.75 && (() => {
                        const sh = apt.startHour;
                        const eh = apt.startHour + apt.durationHours;
                        const fmt = (h: number) => `${Math.floor(h).toString().padStart(2,'0')}:${Math.round((h % 1) * 60).toString().padStart(2,'0')}`;
                        return (
                          <div className="text-[9px] font-black tracking-widest mt-auto opacity-70">
                            {fmt(sh)} – {fmt(eh)}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Détails du RDV Sélectionné */}
      {selectedApt && (
        <div className="w-80 md:w-96 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 fade-in shrink-0">
          <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gray-50/50 dark:bg-dark-bg/50">
            <h3 className="font-black text-gray-900 dark:text-white">Détails du RDV</h3>
            <button onClick={() => setSelectedApt(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0">
                {selectedApt.client.first_name[0]}{selectedApt.client.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-xl text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer truncate">
                  {selectedApt.client.first_name} {selectedApt.client.last_name}
                </h4>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 truncate">{selectedApt.type}</p>
                <div className="mt-3">
                  <span className={clsx("text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-xl font-black", getStatusBadge(selectedApt.status))}>
                    {selectedApt.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-sm">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="font-black text-sm text-gray-900 dark:text-white capitalize">
                    {new Date(selectedApt.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                    {new Date(selectedApt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} 
                    - Durée: {selectedApt.duration_minutes} min
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-sm">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="font-black text-sm text-gray-900 dark:text-white">{selectedApt.client.email || 'Non renseigné'}</p>
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-0.5">Rappel E-mail Activé</p>
                </div>
              </div>
              
              {selectedApt.notes && (
                <div className="pt-6 border-t border-gray-100 dark:border-dark-border">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Notes / Motif</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-bg/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 leading-relaxed">
                    {selectedApt.notes}
                  </p>
                </div>
              )}
              
              <div className="pt-6 border-t border-gray-100 dark:border-dark-border">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tarif Estimé</p>
                <p className="text-2xl font-black text-primary">{(selectedApt.amount || 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-100 dark:border-dark-border space-y-3 bg-gray-50/50 dark:bg-dark-bg/50">
             <button onClick={handleOpenWhatsAppReminder} className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] active:scale-[0.98] text-white py-3.5 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all shadow-lg shadow-[#25D366]/20">
               <MessageSquare size={16} /> Rappel WhatsApp
             </button>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setAppointmentToEdit(selectedApt); setShowModal(true); }}
                className="flex items-center justify-center gap-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-colors"
              >
                <Edit size={14} /> Modifier
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-colors"
              >
                 Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <NewAppointmentModal 
          onClose={() => {
            setShowModal(false);
            setAppointmentToEdit(null);
          }} 
          appointmentToEdit={appointmentToEdit}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAppointment}
        title="Annuler le rendez-vous ?"
        message={`Êtes-vous sûr de vouloir annuler le rendez-vous avec ${selectedApt?.client?.first_name} ${selectedApt?.client?.last_name} prévu le ${selectedApt ? new Date(selectedApt.starts_at).toLocaleDateString('fr-FR') : ''} ? Cette action est irréversible.`}
        confirmText="Oui, annuler"
      />

      {/* Modale d'action et prévisualisation WhatsApp — Libéralis */}
      <WhatsAppActionModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        recipientName={whatsAppData.recipientName}
        recipientPhone={whatsAppData.recipientPhone}
        defaultMessage={whatsAppData.message}
        title="Rappel de Rendez-vous WhatsApp"
        subtitle="Vérifiez le message pré-rempli avant ouverture de la conversation WhatsApp."
      />
    </div>
  );
}

