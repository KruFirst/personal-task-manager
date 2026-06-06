'use client';
import { useState, useEffect, useRef } from 'react';
import QuickDump from './QuickDump';
import FormalAddModal from './FormalAddModal';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  dueDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  archived: boolean;
};

export default function TaskBoard({ activeUserId, onLogout }: { activeUserId: string, onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'KANBAN' | 'CALENDAR' | 'ARCHIVE'>('KANBAN');
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [toastAchievement, setToastAchievement] = useState<{name: string, icon: string, desc: string} | null>(null);
  
  // User Profile State
  const [activeUser, setActiveUser] = useState<{id: string, name: string, avatar: string} | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ name: '', avatar: '', pin: '', oldPin: '' });
  const [showFormalAdd, setShowFormalAdd] = useState(false);
  const notifiedTasks = useRef<Set<string>>(new Set());

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/users');
      const users = await res.json();
      const me = users.find((u: any) => u.id === activeUserId);
      if (me) {
        setActiveUser(me);
        setEditProfileData(prev => ({ ...prev, name: me.name, avatar: me.avatar }));
      }
    } catch(e) {}
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'x-user-id': activeUserId }
      });
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const testNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('ทดสอบระบบแจ้งเตือนสำเร็จ!', {
            body: 'ระบบพร้อมแจ้งเตือนงานของคุณแล้วครับ',
            icon: 'https://cdn-icons-png.flaticon.com/512/1000/1000074.png'
          });
        } else {
          alert('กรุณาอนุญาตการแจ้งเตือน (Allow Notifications) ในเบราว์เซอร์ก่อนครับ');
        }
      });
    } else {
      alert('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน หรือไม่ได้เปิดผ่านเว็บที่ปลอดภัย (https/localhost)');
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUser();
  }, []);

  // Background Notification Polling
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission().catch(e => console.log(e));
        }
      }
    } catch (e) {
      console.log('Notification API error:', e);
    }

    const interval = setInterval(() => {
      try {
        if (!tasks.length) return;
        if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

        const now = new Date();
        
        tasks.forEach(task => {
          if (task.status === 'DONE' || task.archived || !task.dueDate || !task.startTime) return;
          
          const taskDate = new Date(task.dueDate);
          const [hours, minutes] = task.startTime.split(':').map(Number);
          taskDate.setHours(hours, minutes, 0, 0);

          const diffMs = taskDate.getTime() - now.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);

          if (diffMinutes >= 0 && diffMinutes <= 15 && !notifiedTasks.current.has(task.id)) {
            new Notification('🔔 ใกล้ถึงเวลางานแล้ว!', {
              body: `งาน: "${task.title}"\nจะเริ่มในอีก ${diffMinutes} นาที (${task.startTime})`,
              icon: 'https://cdn-icons-png.flaticon.com/512/1000/1000074.png'
            });
            notifiedTasks.current.add(task.id);
          }
        });
      } catch (e) {
        // Silently fail on mobile browsers without Notification support
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks]);

  const updateTaskStatus = async (id: string, status: string) => {
    // optimistic UI update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': activeUserId },
      body: JSON.stringify({ status })
    });
    fetchTasks(); // sync back
  };
  
  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/tasks/${id}`, { 
      method: 'DELETE',
      headers: { 'x-user-id': activeUserId }
    });
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    setTasks(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));
    await fetch(`/api/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': activeUserId },
      body: JSON.stringify({
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        category: editingTask.category,
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString() : null,
        startTime: editingTask.startTime,
        endTime: editingTask.endTime,
        location: editingTask.location,
      })
    });
    setEditingTask(null);
    fetchTasks();
  };

  const archiveAllDone = async () => {
    const activeTasks = tasks.filter(t => !t.archived);
    const doneTasksToArchive = activeTasks.filter(t => t.status === 'DONE');
    if (doneTasksToArchive.length === 0) return;
    
    // Optimistic UI
    setTasks(prev => prev.map(t => doneTasksToArchive.find(d => d.id === t.id) ? { ...t, archived: true } : t));
    
    // Update backend
    await Promise.all(doneTasksToArchive.map(t => 
      fetch(`/api/tasks/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': activeUserId },
        body: JSON.stringify({ archived: true })
      })
    ));
    fetchTasks();
  };

  // Group and sort tasks
  const priorityWeight: Record<string, number> = { 'RED': 3, 'YELLOW': 2, 'GREEN': 1 };
  const sortedTasks = [...tasks].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  const activeTasks = sortedTasks.filter(t => !t.archived);
  const archivedTasks = sortedTasks.filter(t => t.archived);

  const todoTasks = activeTasks.filter(t => t.status === 'TODO');
  const inProgressTasks = activeTasks.filter(t => t.status === 'IN_PROGRESS');
  const doneTasks = activeTasks.filter(t => t.status === 'DONE');

  // Achievements Logic
  const totalTasks = tasks.length;
  const totalDone = tasks.filter(t => t.status === 'DONE').length;
  const totalRedDone = tasks.filter(t => t.status === 'DONE' && t.priority === 'RED').length;
  const totalYellowDone = tasks.filter(t => t.status === 'DONE' && t.priority === 'YELLOW').length;
  const personalDone = tasks.filter(t => t.status === 'DONE' && t.category === 'งานส่วนตัว').length;
  const schoolDone = tasks.filter(t => t.status === 'DONE' && (t.category === 'งานโรงเรียน' || t.category === 'งานปริญญาโท')).length;
  const shopDone = tasks.filter(t => t.status === 'DONE' && t.category === 'ซื้อของ').length;
  const hasArchived = tasks.some(t => t.archived);

  const achievements = [
    { id: 'first_blood', name: 'First Blood', desc: 'เคลียร์งานแรกในระบบสำเร็จ', icon: '🥉', unlocked: totalDone >= 1 },
    { id: 'task_killer', name: 'Task Killer', desc: 'เคลียร์งานครบ 10 ชิ้น', icon: '🥈', unlocked: totalDone >= 10 },
    { id: 'master_of_time', name: 'Master of Time', desc: 'เคลียร์งานครบ 50 ชิ้น', icon: '🥇', unlocked: totalDone >= 50 },
    { id: 'legendary', name: 'Legendary', desc: 'เคลียร์งานครบ 100 ชิ้น', icon: '👑', unlocked: totalDone >= 100 },
    { id: 'workaholic', name: 'Workaholic', desc: 'เพิ่มงานเข้าระบบครบ 100 ชิ้น', icon: '😈', unlocked: totalTasks >= 100 },
    { id: 'flash', name: 'Flash', desc: 'เคลียร์งานสีแดงด่วนมาก 5 ชิ้น', icon: '🏃‍♂️', unlocked: totalRedDone >= 5 },
    { id: 'golden_boy', name: 'Golden Focus', desc: 'เคลียร์งานสำคัญ (สีเหลือง) 10 ชิ้น', icon: '⭐', unlocked: totalYellowDone >= 10 },
    { id: 'focus_mode', name: 'Me Time', desc: 'เคลียร์งานส่วนตัว 5 ชิ้น', icon: '🧘‍♂️', unlocked: personalDone >= 5 },
    { id: 'scholar', name: 'Scholar', desc: 'เคลียร์งานเรียน 5 ชิ้น', icon: '📚', unlocked: schoolDone >= 5 },
    { id: 'shopaholic', name: 'Shopaholic', desc: 'เคลียร์รายการซื้อของ 5 ชิ้น', icon: '🛍️', unlocked: shopDone >= 5 },
    { id: 'neat', name: 'Neat & Tidy', desc: 'กดจัดเก็บงาน (Archive) ครั้งแรก', icon: '🧹', unlocked: hasArchived },
  ];

  useEffect(() => {
    if (loading || tasks.length === 0) return;
    
    const storedStr = localStorage.getItem('unlockedAchievements');
    const previouslyUnlocked = storedStr ? JSON.parse(storedStr) : [];
    
    const newlyUnlocked = achievements.filter(a => a.unlocked && !previouslyUnlocked.includes(a.id));
    
    if (newlyUnlocked.length > 0 && previouslyUnlocked.length > 0) {
      const latest = newlyUnlocked[newlyUnlocked.length - 1];
      setToastAchievement({ name: latest.name, icon: latest.icon, desc: latest.desc });
      setTimeout(() => setToastAchievement(null), 5000);
    }
    
    const currentlyUnlockedIds = achievements.filter(a => a.unlocked).map(a => a.id);
    localStorage.setItem('unlockedAchievements', JSON.stringify(currentlyUnlockedIds));
  }, [tasks, loading]);

  const categoryIcons: Record<string, string> = {
    'งานส่วนตัว': '👤',
    'งานโรงเรียน': '🏫',
    'งานปริญญาโท': '🎓',
    'ซื้อของ': '🛒'
  };

  const renderTask = (task: Task) => (
    <div key={task.id} className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', cursor: 'pointer', transition: 'all 0.2s', borderLeft: `4px solid var(--priority-${task.priority.toLowerCase()})` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, wordBreak: 'break-word', flex: 1 }}>{task.title}</h4>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button onClick={() => setEditingTask(task)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}>✏️</button>
          <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', border: 'none', color: 'var(--priority-red)', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
      </div>
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }}>
          {categoryIcons[task.category] || '📌'} {task.category}
        </span>
        {task.priority === 'RED' && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--priority-red)' }}>🔴 ด่วนมาก</span>}
        {task.priority === 'YELLOW' && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--priority-yellow)' }}>🟡 สำคัญ</span>}
        {task.priority === 'GREEN' && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--priority-green)' }}>🟢 ทั่วไป</span>}
        {task.dueDate && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>📅 {new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {task.status !== 'TODO' && !task.archived && <button onClick={() => updateTaskStatus(task.id, 'TODO')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)' }}>To Do</button>}
        {task.status !== 'IN_PROGRESS' && !task.archived && <button onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.4)' }}>Doing</button>}
        {task.status !== 'DONE' && !task.archived && <button onClick={() => updateTaskStatus(task.id, 'DONE')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.4)' }}>Done</button>}
      </div>
    </div>
  );


  const handleSaveProfile = async () => {
    // Very simple old pin check: The user's active pin is stored on the server.
    // For simplicity, we just send oldPin and pin.
    // Actually, our verify endpoint needs just ID and pin.
    const resVerify = await fetch('/api/users/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, pin: editProfileData.oldPin })
    });
    
    if (!resVerify.ok) {
      alert('รหัส PIN เดิมไม่ถูกต้องครับ');
      return;
    }

    const payload: any = { name: editProfileData.name, avatar: editProfileData.avatar };
    if (editProfileData.pin && editProfileData.pin.length === 4) {
      payload.pin = editProfileData.pin;
    }

    const res = await fetch(`/api/users/${activeUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('อัปเดตโปรไฟล์เรียบร้อย!');
      setShowProfileEdit(false);
      fetchUser();
    }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const monthName = currentMonth.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={prevMonth} className="btn" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}>&lt; ก่อนหน้า</button>
          <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 'bold' }}>{monthName}</h3>
          <button onClick={nextMonth} className="btn" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}>ถัดไป &gt;</button>
        </div>
        
        <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <div style={{ minWidth: '600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d}>{d}</div>)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', gridAutoRows: 'minmax(80px, auto)' }}>
              {blanks.map((_, i) => <div key={`blank-${i}`} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}></div>)}
              {days.map(day => {
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                // Filter tasks that match this date
                const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr));
                
                return (
                  <div key={day} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ alignSelf: 'flex-end', fontSize: '0.875rem', color: dayTasks.length > 0 ? 'white' : 'var(--text-secondary)' }}>{day}</span>
                    {dayTasks.map(t => (
                      <div key={t.id} style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem', 
                        borderRadius: '4px', 
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        opacity: t.status === 'DONE' ? 0.5 : 1
                      }}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: t.priority === 'RED' ? '#ef4444' : t.priority === 'YELLOW' ? '#f59e0b' : '#10b981',
                          flexShrink: 0
                        }}></span>
                        <span style={{ fontSize: '0.75rem' }}>{categoryIcons[t.category] || '📌'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: t.status === 'DONE' ? 'line-through' : 'none' }}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
      
      {/* Header replacing the old layout header */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '16px' }} className="glass-panel animate-slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              I love my Job
            </h1>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic', letterSpacing: '0.5px' }}>by lnwFirst</span>
          </div>
          
          {/* Action Icons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => setShowAchievements(true)} className="btn hover-scale" style={{ padding: '0', background: 'rgba(255, 215, 0, 0.2)', color: '#FFD700', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 215, 0, 0.4)' }} title="ถ้วยรางวัลความสำเร็จ">
              🏆
            </button>
            <button onClick={testNotification} className="btn hover-scale" style={{ padding: '0', background: 'rgba(6, 199, 85, 0.2)', color: '#06C755', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6, 199, 85, 0.4)' }} title="ทดสอบแจ้งเตือนบนเครื่อง">
              🔔
            </button>
            <button onClick={onLogout} className="btn hover-scale" style={{ padding: '0', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--priority-red)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="สลับโปรไฟล์">
              🚪
            </button>
          </div>
        </div>

        {activeUser && (
          <div 
            onClick={() => setShowProfileEdit(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px', cursor: 'pointer', width: 'fit-content' }}
            className="hover-scale"
          >
            <span style={{ fontSize: '1.5rem' }}>{activeUser.avatar}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ผู้ใช้งานปัจจุบัน</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{activeUser.name}</span>
            </div>
            <span style={{ fontSize: '1rem', opacity: 0.5, marginLeft: '0.5rem' }}>⚙️</span>
          </div>
        )}
      </header>

      {/* Edit Modal */}
      {editingTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
            
            {/* Fixed Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✏️ Edit Task</h3>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ชื่องาน</label>
                <input type="text" className="input" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} style={{ width: '100%', marginTop: '0.25rem' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>หมวดหมู่</label>
                  <select className="input" value={editingTask.category} onChange={(e) => setEditingTask({...editingTask, category: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(30, 41, 59, 0.6)' }}>
                    <option value="Inbox">📥 Inbox</option>
                    <option value="งานส่วนตัว">👤 งานส่วนตัว</option>
                    <option value="งานโรงเรียน">🏫 งานโรงเรียน</option>
                    <option value="งานปริญญาโท">🎓 งานปริญญาโท</option>
                    <option value="ซื้อของ">🛒 ซื้อของ</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ความสำคัญ</label>
                  <select className="input" value={editingTask.priority} onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(30, 41, 59, 0.6)' }}>
                    <option value="GREEN">🟢 ทั่วไป</option>
                    <option value="YELLOW">🟡 สำคัญ</option>
                    <option value="RED">🔴 ด่วนมาก</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>🔥 Deadline</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '0.25rem' }}>
                  <input 
                    type="date" 
                    className="input" 
                    value={editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : ''} 
                    onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})} 
                    style={{ 
                      width: '100%', 
                      background: 'rgba(30, 41, 59, 0.6)',
                      color: editingTask.dueDate ? 'transparent' : 'inherit'
                    }} 
                  />
                  {editingTask.dueDate && (
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'white' }}>
                      {new Date(editingTask.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEditingTask(null)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>ยกเลิก</button>
              <button onClick={saveEdit} className="btn" style={{ flex: 1, background: 'var(--primary)', color: 'white' }}>บันทึก</button>
            </div>

          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div className="glass-panel animate-slide-up" style={{ padding: '2rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>⚙️ แก้ไขโปรไฟล์</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                {editProfileData.avatar}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ไอคอน (Emoji)</label>
              <input type="text" maxLength={2} className="input" value={editProfileData.avatar} onChange={(e) => setEditProfileData({...editProfileData, avatar: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', textAlign: 'center', fontSize: '1.5rem' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ชื่อของคุณ</label>
              <input type="text" className="input" value={editProfileData.name} onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})} style={{ width: '100%', marginTop: '0.25rem' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', color: 'var(--priority-yellow)' }}>รหัส PIN เดิม (ต้องใส่เพื่อยืนยัน) *</label>
              <input type="password" maxLength={4} className="input" value={editProfileData.oldPin} onChange={(e) => setEditProfileData({...editProfileData, oldPin: e.target.value.replace(/[^0-9]/g, '')})} style={{ width: '100%', marginTop: '0.25rem', letterSpacing: '0.5rem', textAlign: 'center' }} placeholder="****" />
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>รหัส PIN ใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)</label>
              <input type="password" maxLength={4} className="input" value={editProfileData.pin} onChange={(e) => setEditProfileData({...editProfileData, pin: e.target.value.replace(/[^0-9]/g, '')})} style={{ width: '100%', marginTop: '0.25rem', letterSpacing: '0.5rem', textAlign: 'center' }} placeholder="****" />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => { setShowProfileEdit(false); setEditProfileData({...editProfileData, oldPin: '', pin: ''}); }} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>ยกเลิก</button>
              <button onClick={handleSaveProfile} className="btn" style={{ flex: 1, background: 'var(--primary)' }} disabled={!editProfileData.oldPin || editProfileData.oldPin.length !== 4}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastAchievement && (
        <div className="animate-slide-up" style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 215, 0, 0.5)',
          borderRadius: '12px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          zIndex: 100,
          cursor: 'pointer'
        }} onClick={() => setToastAchievement(null)}>
          <div style={{ fontSize: '2.5rem' }}>{toastAchievement.icon}</div>
          <div>
            <h4 style={{ margin: 0, color: '#FFD700', fontSize: '0.875rem' }}>🎉 ความสำเร็จใหม่!</h4>
            <h3 style={{ margin: '0.25rem 0', color: 'white', fontSize: '1.125rem' }}>{toastAchievement.name}</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{toastAchievement.desc}</p>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div className="glass-panel animate-slide-up" style={{ padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>🏆 ตู้โชว์ถ้วยรางวัล</h3>
              <button onClick={() => setShowAchievements(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1.5rem' }}>
              {achievements.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: a.unlocked ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '12px', border: a.unlocked ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent', opacity: a.unlocked ? 1 : 0.5, transition: 'all 0.3s' }}>
                  <div style={{ fontSize: '2.5rem', filter: a.unlocked ? 'none' : 'grayscale(100%)' }}>{a.icon}</div>
                  <div>
                    <h4 style={{ margin: 0, color: a.unlocked ? '#FFD700' : 'var(--text-secondary)' }}>{a.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{a.desc}</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    {a.unlocked ? '✅' : '🔒'}
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={() => setShowAchievements(false)} className="btn" style={{ marginTop: '0.5rem' }}>ปิด</button>
          </div>
        </div>
      )}

      <QuickDump onTaskAdded={fetchTasks} activeUserId={activeUserId} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Your Tasks</h2>
          <button onClick={() => setShowFormalAdd(true)} className="btn hover-scale" style={{ padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', border: 'none', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>✨</span> เพิ่มงานแบบละเอียด
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--glass-bg)', padding: '0.25rem', borderRadius: '999px', border: '1px solid var(--glass-border)' }}>
            <button onClick={() => setView('KANBAN')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: 'none', background: view === 'KANBAN' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', flex: 1, minWidth: '80px' }}>Kanban</button>
            <button onClick={() => setView('CALENDAR')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: 'none', background: view === 'CALENDAR' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', flex: 1, minWidth: '80px' }}>Calendar</button>
            <button onClick={() => setView('ARCHIVE')} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: 'none', background: view === 'ARCHIVE' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', flex: 1, minWidth: '80px' }}>Archive</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }} className="animate-pulse">Loading tasks...</div>
      ) : view === 'KANBAN' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* TO DO Column */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.4)' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>To Do ({todoTasks.length})</h3>
            {todoTasks.map(renderTask)}
          </div>
          
          {/* IN PROGRESS Column */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.4)' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>In Progress ({inProgressTasks.length})</h3>
            {inProgressTasks.map(renderTask)}
          </div>
          
          {/* DONE Column */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--priority-green)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Done ({doneTasks.length})</h3>
              {doneTasks.length > 0 && (
                <button onClick={archiveAllDone} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                  🧹 Clear
                </button>
              )}
            </div>
            {doneTasks.map(renderTask)}
          </div>
        </div>
      ) : view === 'ARCHIVE' ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📦</span> งานที่จัดเก็บแล้ว (History)
          </h3>
          {archivedTasks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>ยังไม่มีงานที่ถูกจัดเก็บครับ</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {archivedTasks.map(renderTask)}
            </div>
          )}
        </div>
      ) : (
        renderCalendar()
      )}

      {/* Formal Add Modal */}
      {showFormalAdd && (
        <FormalAddModal 
          activeUserId={activeUserId} 
          onClose={() => setShowFormalAdd(false)} 
          onTaskAdded={fetchTasks} 
        />
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowFormalAdd(true)}
        className="hover-scale"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          zIndex: 40,
          cursor: 'pointer'
        }}
        title="เพิ่มงานแบบละเอียด"
      >
        +
      </button>
    </div>
  );
}
