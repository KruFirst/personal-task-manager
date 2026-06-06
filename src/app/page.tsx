'use client';
import { useState, useEffect } from 'react';
import TaskBoard from '@/components/TaskBoard';
import ProfileSelection from '@/components/ProfileSelection';

export default function Home() {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('activeUserId');
    if (stored) {
      setActiveUserId(stored);
    }
    setLoading(false);
  }, []);

  const handleLogin = (id: string) => {
    localStorage.setItem('activeUserId', id);
    setActiveUserId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem('activeUserId');
    setActiveUserId(null);
  };

  if (loading) return null;

  if (!activeUserId) {
    return <ProfileSelection onLogin={handleLogin} />;
  }

  return <TaskBoard activeUserId={activeUserId} onLogout={handleLogout} />;
}
