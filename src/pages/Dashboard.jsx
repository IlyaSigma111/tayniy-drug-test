import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { subscribeToNotifications, markNotificationRead } from '../lib/notifications';
import Profile from './Profile';
import Letters from './Letters';
import AdminPanel from './AdminPanel';
import WriteLetter from './WriteLetter';
import SeedTest from './SeedTest';
import '../styles/App.css';

const THEMES = [
  { id: 'blue', name: 'Синяя', color: '#4169e1' },
  { id: 'red', name: 'Красная', color: '#e14141' },
  { id: 'green', name: 'Зелёная', color: '#41e141' },
  { id: 'white', name: 'Белая', color: '#ffffff' },
  { id: 'purple', name: 'Пурпурная', color: '#a855f7' },
  { id: 'orange', name: 'Оранжевая', color: '#f97316' },
  { id: 'cyan', name: 'Голубая', color: '#06b6d4' },
  { id: 'gold', name: 'Золотая', color: '#eab308' },
  { id: 'pink', name: 'Розовая', color: '#ec4899' },
  { id: 'teal', name: 'Бирюзовая', color: '#14b8a6' },
  { id: 'lilac', name: 'Сиреневая', color: '#c084fc' },
  { id: 'slate', name: 'Серая', color: '#94a3b8' },
  { id: 'amber', name: 'Янтарная', color: '#f59e0b' },
  { id: 'glass', name: 'Стеклянная', color: '#e0e0e0' },
  { id: 'victory', name: 'Победная', color: '#f59e0b' },
];

const Dashboard = () => {
  const { currentUser, logout, getUserProfile } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [assignedRecipient, setAssignedRecipient] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('td-theme') || 'blue');
  const navigate = useNavigate();
  const unsubLetters = useRef(null);
  const unsubNotifs = useRef(null);
  const notifRef = useRef(null);

  const isAdmin = sessionStorage.getItem('admin_auth') === 'true';

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile);

      if (profile?.assignedTo) {
        const recipientDoc = await getDoc(doc(db, 'users', profile.assignedTo));
        if (recipientDoc.exists()) {
          setAssignedRecipient({ id: profile.assignedTo, ...recipientDoc.data() });
        }
      }
      setLoading(false);
    };
    loadData();

    const q = query(
      collection(db, 'letters'),
      where('to', '==', currentUser.uid),
      where('read', '==', false)
    );
    unsubLetters.current = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });

    return () => {
      if (unsubLetters.current) unsubLetters.current();
      if (unsubNotifs.current) unsubNotifs.current();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    unsubNotifs.current = subscribeToNotifications(currentUser.uid, setNotifications);
    return () => { if (unsubNotifs.current) unsubNotifs.current(); };
  }, [currentUser]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (currentTheme === 'blue') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', currentTheme);
    localStorage.setItem('td-theme', currentTheme);
  }, [currentTheme]);

  const toggleTheme = (id) => setCurrentTheme(id);

  const handleLogout = async () => {
    if (!window.confirm('Вы уверены, что хотите выйти?')) return;
    sessionStorage.removeItem('admin_auth');
    await logout();
    navigate('/login');
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Тайный друг</h2>
          <div className="notif-bell" ref={notifRef} onClick={() => setShowNotifications(!showNotifications)}>
            <span className="bell-icon">🔔</span>
            {notifications.length > 0 && <span className="unread-badge notif-count">{notifications.length}</span>}
            {showNotifications && (
              <div className="notif-dropdown">
                {notifications.length === 0 ? (
                  <div className="notif-empty">Нет уведомлений</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="notif-item" onClick={() => {
                      markNotificationRead(n.id);
                      if (n.type === 'letter') navigate('/dashboard/letters');
                    }}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-body">{n.body}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-link">Главная</Link>
          <Link to="/dashboard/profile" className="nav-link">Моя анкета</Link>
          <Link to="/dashboard/letters" className="nav-link">
            Входящие письма
            {unreadCount > 0 && <span className="unread-badge" style={{ marginLeft: 8 }}>{unreadCount}</span>}
          </Link>
          {assignedRecipient && (
            <Link to="/dashboard/write-letter" className="nav-link highlight">Написать письмо</Link>
          )}
          {isAdmin && (
            <Link to="/dashboard/admin" className="nav-link admin-link">Админ-панель</Link>
          )}
        </nav>
        <div className="theme-selector">
          <span className="theme-label">Тема</span>
          <div className="theme-options">
            {THEMES.map(t => (
              <button
                key={t.id}
                className={`theme-dot${currentTheme === t.id ? ' active' : ''}`}
                style={{ '--dot-color': t.color }}
                onClick={() => toggleTheme(t.id)}
                title={t.name}
              />
            ))}
          </div>
        </div>
        <button onClick={handleLogout} className="btn-logout">Выйти</button>
        <a href="https://t.me/PhotographsLair" target="_blank" rel="noopener noreferrer" className="sidebar-telegram">
          Telegram канал разработчика
        </a>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <div className="dashboard-home">
              <h1>Добро пожаловать, {userProfile?.fullName}!</h1>

              {!currentUser?.emailVerified && (
                <div className="warning-banner">
                  Пожалуйста, подтвердите ваш email. Проверьте почту.
                </div>
              )}

              {!userProfile?.profileCompleted && (
                <div className="action-card">
                  <h3>Заполните анкету</h3>
                  <p>Для участия необходимо заполнить анкету</p>
                  <Link to="/dashboard/profile" className="btn-primary">Заполнить анкету</Link>
                </div>
              )}

              {assignedRecipient && (
                <div className="recipient-card">
                  <h3>Ваш получатель</h3>
                  <div className="recipient-info">
                    <p><strong>ФИО:</strong> {assignedRecipient.fullName}</p>
                    {assignedRecipient.region && <p><strong>Регион:</strong> {assignedRecipient.region}</p>}
                    {assignedRecipient.bio && <p><strong>О себе:</strong> {assignedRecipient.bio}</p>}
                  </div>
                  <Link to="/dashboard/write-letter" className="btn-primary">Написать письмо</Link>
                </div>
              )}

              {!assignedRecipient && userProfile?.profileCompleted && (
                <div className="info-card">
                  <h3>Ожидание распределения</h3>
                  <p>Ваша анкета принята. Ожидайте распределения тайных друзей.</p>
                </div>
              )}
            </div>
          } />
          <Route path="/profile" element={<Profile />} />
          <Route path="/letters" element={<Letters />} />
          <Route path="/write-letter" element={<WriteLetter recipient={assignedRecipient} />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/seed" element={<SeedTest />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
