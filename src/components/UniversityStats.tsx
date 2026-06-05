import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LabelList
} from 'recharts';
import { academicService } from '@/services/academicService';
import { BarChart3, Users, FileText, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#a855f7', '#eab308'];

export default function UniversityStats() {
  // Retrieve raw data
  const departments = useMemo(() => academicService.getDepartments('UJKZ'), []);
  const classes = useMemo(() => academicService.getClasses(), []);
  const students = useMemo(() => academicService.getStudents(), []);
  const documents = useMemo(() => {
    // academicService.getDocuments takes classeId first, then universityId
    return academicService.getDocuments(undefined, 'UJKZ');
  }, []);

  // 1. Students per department
  const deptStudentData = useMemo(() => {
    return departments.map((dept, index) => {
      const count = students.filter(s => s.departmentId === dept.id).length;
      return {
        name: dept.code || dept.name,
        fullName: dept.name,
        value: count,
        color: COLORS[index % COLORS.length]
      };
    });
  }, [departments, students]);

  // 2. Class fill rate (actual students vs estimated capacity of 50)
  const classFillData = useMemo(() => {
    return classes.map(cls => {
      const actualCount = students.filter(s => s.classeId === cls.id).length;
      const capacity = 50; // default standard maximum capacity
      const fillRate = Math.min(100, Math.round((actualCount / capacity) * 100));
      return {
        name: cls.code || cls.name,
        fullName: cls.name,
        effectif: actualCount,
        fillRate: fillRate
      };
    });
  }, [classes, students]);

  // 3. Document sharing volume per department
  const docVolumeData = useMemo(() => {
    return departments.map(dept => {
      const count = documents.filter(d => d.departmentId === dept.id).length;
      return {
        name: dept.code || dept.name,
        fullName: dept.name,
        documents: count
      };
    });
  }, [departments, documents]);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-2 mb-2 p-1">
        <BarChart3 className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-900">Analyses & Statistiques de l'Institution</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Students per Department */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Étudiants par département
              </h3>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">Effectifs</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptStudentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptStudentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value} étudiants`, 
                    props.payload.fullName
                  ]} 
                />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Fill Rate of Classes */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-teal-500" />
                Taux de remplissage des classes
              </h3>
              <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-full font-medium">Max: 50 étud.</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classFillData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(value: any) => [`${value}% rempli`]} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="fillRate" name="Taux de remplissage (%)" fill="#14b8a6" radius={[4, 4, 0, 0]}>
                  {classFillData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fillRate > 75 ? '#f43f5e' : '#14b8a6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Shared Documents Volume */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                Volume de documents partagés
              </h3>
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-medium">Docs / Dept</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={docVolumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => [`${value} documents`]} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="documents" name="Documents partagés" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
