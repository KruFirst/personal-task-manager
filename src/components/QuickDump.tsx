'use client';
import { useState } from 'react';

export default function QuickDump({ onTaskAdded, activeUserId }: { onTaskAdded: () => void, activeUserId: string }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('GREEN');
  const [category, setCategory] = useState('Inbox');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFormal, setShowFormal] = useState(false);

  // Formal Add fields
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': activeUserId },
        body: JSON.stringify({
          title,
          status: 'TODO',
          priority,
          category,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          description,
          startTime,
          endTime,
          location,
        }),
      });

      if (res.ok) {
        setTitle('');
        setPriority('GREEN');
        setCategory('Inbox');
        setDueDate('');
        setDescription('');
        setStartTime('');
        setEndTime('');
        setLocation('');
        setShowFormal(false);
        onTaskAdded();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-slide-up" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>⚡</span> Quick Dump
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
        คิดอะไรออก พิมพ์ไว้ก่อน ค่อยจัดทีหลัง!
      </p>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, minWidth: '200px' }}
          placeholder="พิมพ์งานที่ต้องทำอย่างรวดเร็ว (ex. ซื้ออาหารแมว)..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="btn" style={{ background: 'var(--primary)' }} disabled={loading || !title.trim()}>
          {loading ? '...' : 'Quick Add'}
        </button>
      </form>
    </div>
  );
}
