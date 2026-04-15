import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { CVGenerator } from '@/components/CVGenerator';
import { useNavigate } from 'react-router-dom';

export default function CVGeneratorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col">
        <CVGenerator 
          user={user} 
          onClose={() => navigate(-1)} 
          isModal={false}
        />
      </div>
    </div>
  );
}
