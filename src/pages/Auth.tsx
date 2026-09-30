import { useState } from 'react';
import { Eye, EyeOff, HeartPulse, ArrowRight, Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import api from '../services/api';
import { useApp } from '../context/AppContext';

/**
 * Page d'Authentification (Auth.tsx) — Feat 9
 *
 * Regroupe les vues de connexion, d'inscription et de réinitialisation de mot de passe.
 * Stocke le token API Sanctum dans `localStorage` et initialise l'utilisateur dans `AppContext`.
 *
 * Sections logiques :
 * 1. `Login` : Authentification praticien avec pré-remplissage démo
 * 2. `Register` : Inscription avec sélection de spécialité et coordonnées cabinet
 * 3. `ForgotPassword` : Demande de réinitialisation de mot de passe
 */
export function Login() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('a.sow@cabinet.sn');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/login', { email, password });
      
      // Vérification impérative de l'intégrité de la réponse d'authentification
      if (!data?.token || !data?.user) {
        throw new Error(data?.message || 'Réponse de connexion invalide du serveur.');
      }

      // Stockage du token pour les futurs appels API
      localStorage.setItem('auth_token', data.token);
      
      // Mise à jour de l'état global
      setUser(data.user);

      // L'administrateur atterrit sur son dashboard dédié
      navigate(data.user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      const errorMessage = 
        err.response?.data?.message || 
        err.message || 
        'Identifiants incorrects ou serveur inaccessible. Veuillez vérifier votre connexion.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-secondary via-white to-background-tertiary dark:from-dark-bg dark:via-dark-bg dark:to-dark-bg transition-colors duration-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="bg-primary text-white p-3 rounded-2xl shadow-xl shadow-primary/30">
              <HeartPulse size={28} />
            </div>
            <div className="text-left">
              <h1 className="font-black text-3xl leading-none tracking-tighter text-text-main dark:text-white">Libéralis</h1>
              <p className="text-[10px] font-black text-text-secondary dark:text-dark-muted uppercase tracking-widest mt-0.5">Espace Maître</p>
            </div>
          </div>
          <h2 className="text-2xl font-black text-text-main dark:text-white">Connexion à votre espace</h2>
          <p className="text-text-secondary dark:text-dark-muted font-medium mt-2">Retrouvez vos clients, factures et rendez-vous.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-dark-surface rounded-3xl border border-gray-100 dark:border-dark-border shadow-2xl dark:shadow-none p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100 animate-in shake">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Email professionnel</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="a.sow@cabinet.sn" 
              className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-4 text-sm font-bold text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Mot de passe</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-4 text-sm font-bold text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 outline-none pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary rounded" />
              <span className="text-sm font-bold text-text-secondary">Rester connecté</span>
            </label>
            <button type="button" className="text-sm font-black text-primary hover:underline bg-transparent">Mot de passe oublié ?</button>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Se connecter <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm font-bold text-text-secondary mt-6">
          Pas encore de compte ?{' '}
          <button 
            onClick={() => navigate('/inscription')} 
            className="text-primary font-black hover:underline bg-transparent"
          >
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  );
}

const professions = ['Médecin', 'Dentiste', 'Avocat', 'Comptable', 'Kinésithérapeute', 'Consultant', 'Autre'];
const africanCountries = ['Bénin', 'Burkina Faso', "Côte d'Ivoire", 'Cameroun', 'Congo (RDC)', 'Gabon', 'Guinée', 'Guinée-Bissau', 'Mali', 'Mauritanie', 'Niger', 'Sénégal', 'Tchad', 'Togo'];

export function Inscription() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    specialty: '',
    cabinet_name: '',
    profession: ''
  });

  // --- VÉRIFICATIONS ET VALIDATIONS ---
  const validateEmail = (email: string) => {
    if (!email || !email.trim()) {
      return 'Veuillez saisir votre adresse email professionnelle.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Veuillez saisir une adresse email valide (ex: nom@domaine.com).';
    }
    return '';
  };

  const validatePassword = (password: string, confirmation: string = formData.password_confirmation) => {
    if (!password || !password.trim()) {
      return 'Veuillez saisir votre mot de passe.';
    }
    if (password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    if (confirmation && password !== confirmation) {
      return 'Les mots de passe ne correspondent pas.';
    }
    return '';
  };

  // --- GESTIONNAIRES D'ÉVÉNEMENTS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Re-validation dynamique lors de la saisie si une erreur était déjà présente
    if (name === 'email' && emailError) {
      setEmailError(validateEmail(value));
    }
    if ((name === 'password' || name === 'password_confirmation') && passwordError) {
      setPasswordError(validatePassword(name === 'password' ? value : formData.password, name === 'password_confirmation' ? value : formData.password_confirmation));
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      const err = validateEmail(formData.email);
      if (err) {
        setEmailError(err);
        return;
      }
    }
    setEmailError('');
    setError('');
    setStep(s => s + 1);
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/register', formData);
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1, label: 'Informations' },
    { n: 2, label: 'Profil pro' },
    { n: 3, label: 'Confirmation' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-secondary via-white to-background-tertiary dark:from-dark-bg dark:via-dark-bg dark:to-dark-bg transition-colors duration-300 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="bg-primary text-white p-3 rounded-2xl shadow-xl shadow-primary/30">
              <HeartPulse size={28} />
            </div>
            <h1 className="font-black text-3xl leading-none tracking-tighter text-text-main dark:text-white">Libéralis</h1>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all",
                    step > s.n ? "bg-primary text-white" : step === s.n ? "bg-primary text-white ring-4 ring-primary/20" : "bg-gray-200 text-gray-500"
                  )}>
                    {step > s.n ? <Check size={14} /> : s.n}
                  </div>
                  <span className={clsx("text-sm font-black hidden sm:block", step >= s.n ? "text-primary" : "text-gray-400")}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={clsx("w-8 h-0.5 rounded-full", step > s.n ? "bg-primary" : "bg-gray-200")} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-3xl border border-gray-100 dark:border-dark-border shadow-2xl dark:shadow-none p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100 italic">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-black text-text-main dark:text-white">Informations personnelles</h2>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Nom complet</label>
                <input name="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="Maitre Amadou Sow" className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Email professionnel *</label>
                <input 
                  name="email" 
                  type="email" 
                  required
                  value={formData.email} 
                  onChange={handleInputChange}
                  onBlur={() => setEmailError(validateEmail(formData.email))}
                  placeholder="a.sow@cabinet.sn" 
                  className={clsx(
                    "w-full rounded-xl px-4 py-3.5 text-sm font-bold transition-all outline-none",
                    emailError 
                      ? "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 border-2 border-red-500 focus:ring-2 focus:ring-red-500/20" 
                      : "bg-gray-100 dark:bg-dark-bg text-text-main dark:text-white border border-transparent focus:ring-2 focus:ring-primary/20"
                  )}
                />
                {emailError && (
                  <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                    <span>⚠️</span> {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Téléphone</label>
                <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="+221 77 ..." className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Mot de passe</label>
                  <input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Confirmer</label>
                  <input name="password_confirmation" type="password" value={formData.password_confirmation} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-black text-text-main dark:text-white">Profil professionnel</h2>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Profession</label>
                <select name="profession" value={formData.profession} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none">
                  <option value="">Sélectionner...</option>
                  {professions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Spécialité</label>
                <input name="specialty" type="text" value={formData.specialty} onChange={handleInputChange} placeholder="Droit des affaires, Pénal, etc." className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Nom du cabinet (optionnel)</label>
                <input name="cabinet_name" type="text" value={formData.cabinet_name} onChange={handleInputChange} placeholder="Cabinet Sow & Associés" className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Pays d'exercice</label>
                <select className="w-full bg-gray-100 dark:bg-dark-bg rounded-xl px-4 py-3.5 text-sm font-bold text-text-main dark:text-white outline-none">
                  <option value="">Sélectionner votre pays...</option>
                  {africanCountries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <InscriptionRecap
              formData={formData}
              onSubmit={handleRegister}
              onBack={() => setStep(2)}
              isLoading={loading}
            />
          )}

          {step < 3 && (
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-text-main dark:text-white rounded-2xl text-sm font-black hover:bg-gray-200 transition-all">
                  Retour
                </button>
              )}
              <button
                disabled={loading}
                onClick={handleNextStep}
                className="flex-1 py-4 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                Continuer
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm font-bold text-text-secondary mt-6">
          Déjà un compte ?{' '}
          <button 
            onClick={() => navigate('/login')} 
            className="text-primary font-black hover:underline bg-transparent"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}

function InscriptionRecap({ formData, onSubmit, onBack, isLoading }: any) {
  const professionsMapping: Record<string, string> = {
    'Médecin': 'Médecin',
    'Dentiste': 'Dentiste',
    'Avocat': 'Avocat',
    'Comptable': 'Comptable',
    'Kinésithérapeute': 'Kinésithérapeute',
    'Consultant': 'Consultant',
    'Autre': 'Autre',
  };

  const fields = [
    { label: "Nom complet", valeur: formData.name },
    { label: "Email", valeur: formData.email },
    { label: "Téléphone", valeur: formData.phone },
    { label: "Profession", valeur: professionsMapping[formData.profession] || formData.profession },
    formData.specialty && { label: "Spécialité", valeur: formData.specialty },
    formData.cabinet_name && { label: "Cabinet", valeur: formData.cabinet_name },
  ].filter(Boolean) as { label: string, valeur: string }[];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">
          Étape 3 sur 3
        </p>
        <h2 className="text-xl font-black text-text-main dark:text-white">
          Vérifiez vos informations
        </h2>
        <p className="text-sm font-medium text-text-secondary mt-1">
          Relisez vos informations avant de créer votre compte.
        </p>
      </div>

      <div className="border border-gray-100 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-primary/5 px-5 py-3 border-b border-gray-100 dark:border-dark-border">
          <p className="text-xs font-black text-primary uppercase tracking-widest">
            Récapitulatif du compte
          </p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-dark-border bg-white dark:bg-dark-surface">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex justify-between items-center px-5 py-4"
            >
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                {field.label}
              </span>
              <span className="text-sm font-bold text-text-main dark:text-white">
                {field.valeur}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-5 py-4">
        <Check
          className="text-primary mt-0.5 flex-shrink-0"
          size={18}
        />
        <p className="text-sm font-bold text-primary leading-tight">
          <span className="font-black">Essai gratuit 30 jours</span>
          {" "}— sans carte bancaire. Annulable à tout moment.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className={`
            w-full py-4 px-6 rounded-2xl text-white text-sm font-black transition-all shadow-lg shadow-primary/20
            ${isLoading
              ? "bg-primary/60 cursor-not-allowed"
              : "bg-primary hover:bg-primary-hover active:scale-[0.98]"
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Création du compte...
            </span>
          ) : (
            "Créer mon compte gratuitement"
          )}
        </button>

        <button
          onClick={onBack}
          disabled={isLoading}
          className="w-full py-4 px-6 rounded-2xl text-sm font-black text-text-secondary dark:text-gray-300 border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          ← Retour
        </button>
      </div>

      <p className="text-[10px] font-bold text-text-secondary text-center leading-relaxed px-4">
        En créant votre compte, vous acceptez nos{" "}
        <button className="text-primary hover:underline bg-transparent">conditions d'utilisation</button>
        {" "}et notre{" "}
        <button className="text-primary hover:underline bg-transparent">politique de confidentialité</button>.
      </p>
    </div>
  );
}


