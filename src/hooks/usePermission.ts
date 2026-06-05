import { useAuth } from '@/context/AuthContext';
import { AcademicRole } from '@/types/academic';

export type Permission = 
  | 'manage_departments'
  | 'manage_filieres'
  | 'manage_classes'
  | 'manage_students'
  | 'view_university_portal'
  | 'view_admin_portal'
  | 'create_event'
  | 'create_document'
  | 'post_message'
  | 'manage_timetables';

const rolePermissions: Record<AcademicRole | string, Permission[]> = {
  super_admin: ['manage_departments', 'manage_filieres', 'manage_classes', 'manage_students', 'view_university_portal', 'view_admin_portal', 'create_event', 'create_document', 'post_message', 'manage_timetables'],
  admin_university: ['manage_departments', 'manage_filieres', 'manage_classes', 'manage_students', 'view_university_portal', 'create_event', 'create_document', 'post_message', 'manage_timetables'],
  chef_departement: ['manage_filieres', 'manage_classes', 'manage_students', 'view_university_portal', 'create_event', 'create_document', 'post_message', 'manage_timetables'],
  responsable_filiere: ['manage_classes', 'view_university_portal', 'create_document', 'post_message', 'manage_timetables'],
  responsable_classe: ['post_message', 'manage_timetables'],
  teacher: ['create_document', 'post_message'],
  student: [],
  admin: ['manage_departments', 'manage_filieres', 'manage_classes', 'manage_students', 'view_university_portal', 'view_admin_portal', 'create_event', 'create_document', 'post_message', 'manage_timetables'], // mapping legacy generic admin
  institution: ['manage_departments', 'manage_filieres', 'manage_classes', 'manage_students', 'view_university_portal', 'create_event', 'create_document', 'post_message', 'manage_timetables'] // legacy generic institution
};

export function usePermission() {
  const { user } = useAuth();
  
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    // Map legacy roles or academic roles
    const userRole = user.role; 
    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
  };
  
  return { hasPermission };
}
