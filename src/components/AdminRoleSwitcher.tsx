import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, ChevronDown, Check, RefreshCw, AlertTriangle, Users } from 'lucide-react';
import { User } from '@/types';

export function AdminRoleSwitcher() {
  const { isRealAdmin, impersonatedRole, setImpersonatedRole, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // If they are not a real administrator, never render this testing widget
  if (!isRealAdmin) return null;

  const roles: { value: User['role']; label: string; icon: string; desc: string }[] = [
    { value: 'admin', label: 'Administrateur', icon: '👑', desc: 'Accès complet au tableau de bord' },
    { value: 'student', label: 'Étudiant', icon: '📚', desc: 'Sujet aux restrictions et limites' },
    { value: 'teacher', label: 'Enseignant / Prof', icon: '👨‍🏫', desc: 'Gestion des cours et profils profs' },
    { value: 'alumni', label: 'Alumni / Mentor', icon: '🎓', desc: 'Programme de mentorat et conseils' },
    { value: 'parent', label: 'Parent d\'élève', icon: '👪', desc: 'Suivi et contact avec les profs' },
    { value: 'company', label: 'Entreprise / Recruteur', icon: '💼', desc: 'Publication de stages et offres' },
    { value: 'institution', label: 'Établissement', icon: '🏫', desc: 'Profil universitaire officiel' }
  ];

  const currentRole = impersonatedRole || 'admin';
  const currentRoleObj = roles.find(r => r.value === currentRole) || roles[0];

  const handleSelectRole = (role: User['role']) => {
    if (role === 'admin') {
      setImpersonatedRole(null);
    } else {
      setImpersonatedRole(role);
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {/* Impersonation Indicator Toast Warning */}
      {impersonatedRole && (
        <div className="absolute bottom-16 right-0 mb-2 w-72 rounded-xl bg-amber-50 border border-amber-200 p-3 shadow-lg animate-bounce duration-1000">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-800">Mode Simulation Actif</p>
              <p className="text-amber-600 mt-0.5">
                Tu navigues en tant que <strong className="font-bold">{currentRoleObj.label}</strong>. Certains accès sont restreints pour tes tests.
              </p>
              <button
                onClick={() => setImpersonatedRole(null)}
                className="mt-2 text-[10px] font-bold text-amber-800 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Rétablir le rôle Administrateur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
            impersonatedRole
              ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          id="admin-role-switcher-trigger"
        >
          <Shield className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold tracking-wide">
            {impersonatedRole ? `Test: ${currentRoleObj.label}` : 'Simulateur de Rôles'}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute bottom-12 right-0 mb-2 w-80 overflow-hidden rounded-2xl bg-white border border-gray-150 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  Changer de rôle de test
                </h4>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Simule l'expérience étudiante et partenaire instantanément.
                </p>
              </div>
              {impersonatedRole && (
                <button
                  onClick={() => {
                    setImpersonatedRole(null);
                    setIsOpen(false);
                  }}
                  title="Réinitialiser"
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-150 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto py-1.5">
              {roles.map(r => {
                const isActive = currentRole === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => handleSelectRole(r.value)}
                    className={`w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-900' 
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-lg leading-none mt-0.5">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isActive ? 'text-emerald-700' : 'text-gray-900'}`}>
                          {r.label}
                        </span>
                        {isActive && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-emerald-600/80' : 'text-gray-500'}`}>
                        {r.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 text-[10px] text-gray-500 flex items-center justify-between">
              <span>Profil réel : <strong className="font-semibold text-gray-700">{user?.email}</strong></span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[8px]">
                Admin
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
