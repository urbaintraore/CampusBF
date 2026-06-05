import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Users, GraduationCap, School, BookOpen, Clock } from 'lucide-react';
import { academicService } from '@/services/academicService';

export default function MultiCriteriaSearch() {
  // Local copies of academic data
  const depts = useMemo(() => academicService.getDepartments('UJKZ'), []);
  const filieres = useMemo(() => academicService.getFilieres(undefined, 'UJKZ'), []);
  const classes = useMemo(() => academicService.getClasses(), []);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [activeSearchTab, setActiveSearchTab] = useState<'all' | 'depts' | 'filieres' | 'classes'>('all');

  // Extract unique academic years for dropdown filter from classes
  const academicYears = useMemo(() => {
    const years = new Set<string>();
    classes.forEach(c => {
      if (c.academicYear) years.add(c.academicYear);
    });
    return Array.from(years);
  }, [classes]);

  // Real-time filtering logic
  const filteredDepts = useMemo(() => {
    return depts.filter(dept => {
      const matchesKeyword = !searchTerm || 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesResponsible = !responsibleFilter || 
        dept.responsible.toLowerCase().includes(responsibleFilter.toLowerCase());

      // Departments do not have academicYear property, so they match all years or are excluded if year is specific (or we ignore year filter for departments to allow them to show)
      const matchesYear = academicYearFilter === 'all';

      return matchesKeyword && matchesResponsible && matchesYear;
    });
  }, [depts, searchTerm, responsibleFilter, academicYearFilter]);

  const filteredFilieres = useMemo(() => {
    return filieres.filter(fil => {
      const matchesKeyword = !searchTerm || 
        fil.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        fil.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fil.description && fil.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesResponsible = !responsibleFilter || 
        fil.responsible.toLowerCase().includes(responsibleFilter.toLowerCase());

      // Filieres do not have academicYear directly, so they match all years
      const matchesYear = academicYearFilter === 'all';

      return matchesKeyword && matchesResponsible && matchesYear;
    });
  }, [filieres, searchTerm, responsibleFilter, academicYearFilter]);

  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchesKeyword = !searchTerm || 
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        cls.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesResponsible = !responsibleFilter || 
        (cls.responsible && cls.responsible.toLowerCase().includes(responsibleFilter.toLowerCase()));

      const matchesYear = academicYearFilter === 'all' || cls.academicYear === academicYearFilter;

      return matchesKeyword && matchesResponsible && matchesYear;
    });
  }, [classes, searchTerm, responsibleFilter, academicYearFilter]);

  const hasActiveFilters = searchTerm !== '' || responsibleFilter !== '' || academicYearFilter !== 'all';

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
      <div className="flex flex-col gap-2 mb-5">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-600" />
          Recherche Multi-Critères de l'Académie
        </h3>
        <p className="text-slate-500 text-sm">
          Filtrez en temps réel les départements, filières et classes par responsable ou par année académique.
        </p>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recherche textuelle</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ex: Génie Logiciel, MI..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/55 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-2xl text-sm transition-all text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Par Responsable</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Users size={16} />
            </span>
            <input
              type="text"
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
              placeholder="Nom du directeur, prof, etc."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/55 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-2xl text-sm transition-all text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Année Académique</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Clock size={16} />
            </span>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/55 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-2xl text-sm transition-all text-slate-800 appearance-none cursor-pointer"
            >
              <option value="all">Toutes les années académiques</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 pb-3 mb-4 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSearchTab('all')}
          className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeSearchTab === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-900 bg-slate-50'
          }`}
        >
          Tout ({filteredDepts.length + filteredFilieres.length + filteredClasses.length})
        </button>
        <button
          onClick={() => setActiveSearchTab('depts')}
          className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeSearchTab === 'depts'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-500 hover:text-indigo-600 bg-indigo-50/50'
          }`}
        >
          Départements ({filteredDepts.length})
        </button>
        <button
          onClick={() => setActiveSearchTab('filieres')}
          className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeSearchTab === 'filieres'
              ? 'bg-purple-600 text-white'
              : 'text-slate-500 hover:text-purple-600 bg-purple-50/50'
          }`}
        >
          Filières ({filteredFilieres.length})
        </button>
        <button
          onClick={() => setActiveSearchTab('classes')}
          className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeSearchTab === 'classes'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-500 hover:text-emerald-600 bg-emerald-50/50'
          }`}
        >
          Classes ({filteredClasses.length})
        </button>
      </div>

      {/* Filtered Lists Grid */}
      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
        
        {/* DEPARTMENTS VIEW */}
        {(activeSearchTab === 'all' || activeSearchTab === 'depts') && filteredDepts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-indigo-600 tracking-wide uppercase px-1">Départements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDepts.map(dept => (
                <div key={dept.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <School size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-indigo-200/50 text-indigo-700 px-1.5 py-0.5 rounded font-mono uppercase">{dept.code}</span>
                      <h5 className="font-bold text-slate-800 text-sm leading-tight">{dept.name}</h5>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 font-medium flex items-center gap-1">
                      <span className="text-slate-400">Resp. :</span> {dept.responsible}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILIERES VIEW */}
        {(activeSearchTab === 'all' || activeSearchTab === 'filieres') && filteredFilieres.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold text-purple-600 tracking-wide uppercase px-1">Filières / Parcours</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFilieres.map(fil => (
                <div key={fil.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-purple-200/50 text-purple-700 px-1.5 py-0.5 rounded font-mono uppercase">{fil.code}</span>
                      <h5 className="font-bold text-slate-800 text-sm leading-tight">{fil.name}</h5>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 font-medium flex items-center gap-1">
                      <span className="text-slate-400">Resp. :</span> {fil.responsible}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLASSES VIEW */}
        {(activeSearchTab === 'all' || activeSearchTab === 'classes') && filteredClasses.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold text-emerald-600 tracking-wide uppercase px-1">Classes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredClasses.map(cls => (
                <div key={cls.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-emerald-200/50 text-emerald-700 px-1.5 py-0.5 rounded font-mono uppercase">{cls.code}</span>
                      <h5 className="font-bold text-slate-800 text-sm leading-tight">{cls.name}</h5>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">{cls.academicYear}</p>
                    <p className="text-xs text-slate-600 mt-1.5 font-medium flex items-center gap-1">
                      <span className="text-slate-400">Resp. :</span> {cls.responsible || 'Non assigné'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {((activeSearchTab === 'all' && filteredDepts.length === 0 && filteredFilieres.length === 0 && filteredClasses.length === 0) ||
          (activeSearchTab === 'depts' && filteredDepts.length === 0) ||
          (activeSearchTab === 'filieres' && filteredFilieres.length === 0) ||
          (activeSearchTab === 'classes' && filteredClasses.length === 0)) && (
          <div className="p-8 text-center text-slate-400">
            <SlidersHorizontal size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">Aucun résultat ne correspond à vos filtres</p>
            {hasActiveFilters && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setResponsibleFilter('');
                  setAcademicYearFilter('all');
                }}
                className="text-xs text-indigo-600 hover:underline mt-2 font-bold"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
