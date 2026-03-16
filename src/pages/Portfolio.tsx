import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Portfolio } from '../types';
import { Plus, Trash2, Save } from 'lucide-react';

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projects, setProjects] = useState([{ title: '', description: '' }]);

  useEffect(() => {
    if (user) {
      fetchPortfolio();
    }
  }, [user]);

  const fetchPortfolio = async () => {
    const q = query(collection(db, 'portfolios'), where('teacherId', '==', user?.id));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data() as Portfolio;
      setPortfolio(data);
      setTitle(data.title);
      setDescription(data.description);
      setProjects(data.projects);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const portfolioData = {
      teacherId: user.id,
      title,
      description,
      projects,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'portfolios'), portfolioData);
    fetchPortfolio();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Créer votre Portfolio</h1>
      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du portfolio"
          className="w-full p-2 border rounded"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full p-2 border rounded"
        />
        <h2 className="text-xl font-semibold">Projets</h2>
        {projects.map((project, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={project.title}
              onChange={(e) => {
                const newProjects = [...projects];
                newProjects[index].title = e.target.value;
                setProjects(newProjects);
              }}
              placeholder="Titre du projet"
              className="p-2 border rounded flex-1"
            />
            <input
              type="text"
              value={project.description}
              onChange={(e) => {
                const newProjects = [...projects];
                newProjects[index].description = e.target.value;
                setProjects(newProjects);
              }}
              placeholder="Description du projet"
              className="p-2 border rounded flex-1"
            />
          </div>
        ))}
        <button
          onClick={() => setProjects([...projects, { title: '', description: '' }])}
          className="flex items-center gap-2 text-emerald-600"
        >
          <Plus size={20} /> Ajouter un projet
        </button>
        <button
          onClick={handleSave}
          className="bg-emerald-600 text-white p-2 rounded flex items-center gap-2"
        >
          <Save size={20} /> Enregistrer
        </button>
      </div>
    </div>
  );
}
