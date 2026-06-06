import { useState, useEffect } from 'react';

type User = {
  id: string;
  name: string;
  avatar: string;
};

export default function ProfileSelection({ onLogin }: { onLogin: (userId: string) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(setUsers);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    
    const res = await fetch('/api/users/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUser.id, pin })
    });
    
    const data = await res.json();
    if (data.success) {
      onLogin(selectedUser.id);
    } else {
      setError('รหัสผ่านไม่ถูกต้อง');
      setPin('');
    }
  };

  if (!selectedUser) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>ใครกำลังใช้งานอยู่?</h1>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {users.map(u => (
            <div 
              key={u.id} 
              onClick={() => setSelectedUser(u)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ width: '120px', height: '120px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', border: '2px solid transparent', transition: 'border-color 0.2s' }} 
                   onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'}
                   onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                {u.avatar}
              </div>
              <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>{u.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
          {selectedUser.avatar}
        </div>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>ยินดีต้อนรับ, {selectedUser.name}</h2>
      </div>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '300px' }}>
        <input 
          type="password" 
          maxLength={4} 
          placeholder="รหัส 4 หลัก" 
          value={pin}
          onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
          style={{ width: '100%', padding: '1rem', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
          autoFocus
        />
        {error && <p style={{ color: 'var(--priority-red)', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
          <button type="button" onClick={() => { setSelectedUser(null); setPin(''); setError(''); }} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>กลับ</button>
          <button type="submit" className="btn" style={{ flex: 2, background: 'var(--primary)' }}>เข้าใช้งาน</button>
        </div>
      </form>
    </div>
  );
}
