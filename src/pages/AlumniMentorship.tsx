import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { AlumniProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export default function AlumniMentorship() {
  const { user } = useAuth();
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [bio, setBio] = useState('');
  const [topics, setTopics] = useState('');
  const [availability, setAvailability] = useState('');

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    const querySnapshot = await getDocs(collection(db, 'alumniProfiles'));
    const alumniData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlumniProfile));
    setAlumni(alumniData);
  };

  const handleRegister = async () => {
    if (!user) return;
    const profileData: AlumniProfile = {
      id: user.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userAvatarUrl: user.avatarUrl,
      bio,
      mentorshipTopics: topics.split(',').map(t => t.trim()),
      availability,
    };
    await setDoc(doc(db, 'alumniProfiles', user.id), profileData);
    setIsRegistering(false);
    fetchAlumni();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mentorat Alumni</h1>
        <button onClick={() => setIsRegistering(!isRegistering)} className="bg-emerald-600 text-white p-2 rounded">
          {isRegistering ? 'Annuler' : 'Devenir Mentor'}
        </button>
      </div>

      {isRegistering && (
        <div className="p-4 border rounded shadow-sm mb-6 space-y-4">
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Votre bio" className="w-full p-2 border rounded" />
          <input value={topics} onChange={e => setTopics(e.target.value)} placeholder="Sujets (séparés par des virgules)" className="w-full p-2 border rounded" />
          <input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="Disponibilité" className="w-full p-2 border rounded" />
          <button onClick={handleRegister} className="bg-emerald-600 text-white p-2 rounded">Enregistrer</button>
        </div>
      )}

      <div className="grid gap-4">
        {alumni.map((alum) => (
          <div key={alum.id} className="p-4 border rounded shadow-sm flex gap-4 items-center">
            <img src={alum.userAvatarUrl} alt={alum.userName} className="w-16 h-16 rounded-full object-cover" />
            <div>
              <h2 className="text-xl font-semibold">{alum.userName}</h2>
              <p>{alum.bio}</p>
              <p className="text-sm text-gray-600">Sujets: {alum.mentorshipTopics.join(', ')}</p>
              <p className="text-sm text-gray-600">Disponibilité: {alum.availability}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
