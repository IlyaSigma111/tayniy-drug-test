import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import Profile from './Profile';
import Letters from './Letters';
import AdminPanel from './AdminPanel';
import WriteLetter from './WriteLetter';
import '../styles/App.css';

const Dashboard = () => {
  const { currentUser, logout, getUserProfile } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [assignedRecipient, setAssignedRecipient] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const unsubLetters = useRef(null);

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
    };
  }, [currentUser]);

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
        <button onClick={handleLogout} className="btn-logout">Выйти</button>
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
                    {assignedRecipient.profilePhoto && (
                      <img src={assignedRecipient.profilePhoto} alt="Фото получателя" className="recipient-photo" />
                    )}
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
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
