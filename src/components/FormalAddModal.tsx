'use client';
import { useState } from 'react';

export default function FormalAddModal({ 
  activeUserId, 
  onClose, 
  onTaskAdded 
}: { 
  activeUserId: string; 
  onClose: () => void; 
  onTaskAdded: () => void; 
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('GREEN');
  const [category, setCategory] = useState('Inbox');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        onTaskAdded();
        onClose();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
      <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '550px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
        
        {/* Fixed Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📋 เพิ่มงานแบบละเอียด</h3>
        </div>
        
        {/* Scrollable Body */}
        <div style={{ padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ชื่องาน *</label>
            <input type="text" className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }} placeholder="ระบุชื่องาน" autoFocus />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>หมวดหมู่</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(30, 41, 59, 0.6)' }}>
                <option value="Inbox">📥 Inbox</option>
                <option value="งานส่วนตัว">👤 งานส่วนตัว</option>
                <option value="งานโรงเรียน">🏫 งานโรงเรียน</option>
                <option value="งานปริญญาโท">🎓 งานปริญญาโท</option>
                <option value="ซื้อของ">🛒 ซื้อของ</option>
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ความสำคัญ</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(30, 41, 59, 0.6)' }}>
                <option value="GREEN">🟢 ทั่วไป</option>
                <option value="YELLOW">🟡 สำคัญ</option>
                <option value="RED">🔴 ด่วนมาก</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>รายละเอียด (Description)</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', marginTop: '0.25rem', minHeight: '80px', resize: 'vertical' }} placeholder="รายละเอียดเพิ่มเติม..." />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>วันที่</label>
              <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(30, 41, 59, 0.6)' }} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>สถานที่ (Location)</label>
              <input type="text" className="input" value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }} placeholder="ประชุมที่ไหน..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>เวลาเริ่ม (Start Time)</label>
              <input type="time" lang="en-GB" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(30, 41, 59, 0.6)' }} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>เวลาสิ้นสุด (End Time)</label>
              <input type="time" lang="en-GB" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(30, 41, 59, 0.6)' }} />
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>ยกเลิก</button>
          <button type="button" onClick={() => handleSubmit()} className="btn" style={{ flex: 1, background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', border: 'none', color: 'white', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }} disabled={loading || !title.trim()}>✨ บันทึกงาน</button>
        </div>
        
      </div>
    </div>
  );
}
