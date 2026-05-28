import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/App.css';

const ADMIN_PASSWORD = 'мухоморпоганка';

const AdminPanel = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [letters, setLetters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(
    sessionStorage.getItem('admin_auth') === 'true'
  );

  useEffect(() => {
    if (authenticated) loadData();
    else setLoading(false);
  }, [authenticated]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      setAuthenticated(true);
      setPassword('');
      loadData();
    } else {
      setMessage('Неверный пароль');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersSnap, lettersSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'letters'))
      ]);

      const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const lettersList = lettersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setUsers(usersList);
      setLetters(lettersList);

      const completed = usersList.filter(u => u.profileCompleted);
      const withAssignment = usersList.filter(u => u.assignedTo);

      setStats({
        total: usersList.length,
        completed: completed.length,
        assigned: withAssignment.length,
        letters: lettersList.length
      });
    } catch (err) {
      setMessage('Ошибка загрузки данных: ' + err.message);
    }
    setLoading(false);
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const hasMutual = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      const giver = arr[i];
      const receiver = arr[(i + 1) % arr.length];
      for (let j = 0; j < arr.length; j++) {
        if (arr[j].id === receiver.id) {
          if (arr[(j + 1) % arr.length].id === giver.id) return true;
        }
      }
    }
    return false;
  };

  const tryDistribute = (participants) => {
    let attempts = 0;
    let result;
    do {
      result = shuffle(participants);
      attempts++;
    } while (hasMutual(result) && attempts < 100);
    return result;
  };

  // Режим 1: полное перераспределение (все с анкетой)
  const runFullDistribution = async () => {
    const pool = users.filter(u => u.profileCompleted);
    if (pool.length < 2) {
      setMessage('Недостаточно участников (минимум 2)');
      return;
    }

    if (pool.length === 2 && !window.confirm('Всего 2 участника. Будут назначены друг на друга. Продолжить?')) return;
    if (pool.length > 2 && stats.assigned > 0 && !window.confirm('Некоторые участники уже имеют назначения. Перераспределить всех?')) return;

    setBusy(true);
    setMessage('');

    try {
      const shuffled = tryDistribute(pool);
      const updates = shuffled.map((giver, i) => {
        const receiver = shuffled[(i + 1) % shuffled.length];
        return updateDoc(doc(db, 'users', giver.id), {
          assignedTo: receiver.id,
          distributionLocked: true
        });
      });
      await Promise.all(updates);
      setMessage(`Полное перераспределение! ${shuffled.length} пар.`);
      loadData();
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
    }
    setBusy(false);
  };

  // Режим 2: добавить новичков (только у кого нет назначения)
  const addNewcomers = async () => {
    const unassigned = users.filter(u => u.profileCompleted && !u.assignedTo);
    const alreadyAssigned = users.filter(u => u.assignedTo);

    if (unassigned.length === 0) {
      setMessage('Нет новых участников для распределения');
      return;
    }

    // Берём уже назначенных и новичков, перетасовываем только новичков,
    // потом вставляем их в "дырки" существующего цикла
    setBusy(true);
    setMessage('');

    try {
      const pool = [...alreadyAssigned, ...unassigned];
      const shuffled = tryDistribute(pool);
      const updates = shuffled.map((giver, i) => {
        const receiver = shuffled[(i + 1) % shuffled.length];
        return updateDoc(doc(db, 'users', giver.id), {
          assignedTo: receiver.id,
          distributionLocked: true
        });
      });
      await Promise.all(updates);
      setMessage(`Добавлено ${unassigned.length} новых участников. Всего ${shuffled.length} пар.`);
      loadData();
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
    }
    setBusy(false);
  };

  const resetDistribution = async () => {
    if (!window.confirm('Сбросить ВСЕ назначения?')) return;
    setBusy(true);
    setMessage('');
    try {
      const updates = users
        .filter(u => u.assignedTo)
        .map(u => updateDoc(doc(db, 'users', u.id), {
          assignedTo: null,
          distributionLocked: false
        }));
      await Promise.all(updates);
      setMessage('Все назначения сброшены');
      loadData();
    } catch (err) {
      setMessage('Ошибка сброса: ' + err.message);
    }
    setBusy(false);
  };

  const unassignedCount = users.filter(u => u.profileCompleted && !u.assignedTo).length;

  if (loading) return <div className="loading">Загрузка...</div>;

  if (!authenticated) {
    return (
      <div className="page-content">
        <h1 className="page-title">Административная панель</h1>
        <form onSubmit={handlePasswordSubmit} className="password-form">
          <h2>Введите пароль</h2>
          {message && <div className="error-message">{message}</div>}
          <div className="form-group">
            <input type="password" value={password}
              onChange={(e) => { setPassword(e.target.value); setMessage(''); }}
              placeholder="Пароль администратора" autoFocus />
          </div>
          <button type="submit" className="btn-primary">Войти</button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1 className="page-title">Административная панель</h1>

      {message && (
        <div className={message.includes('Ошибка') || message.includes('Неверный') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Всего</h3>
          <p className="stat-number">{stats?.total}</p>
        </div>
        <div className="stat-card">
          <h3>Анкеты</h3>
          <p className="stat-number">{stats?.completed}</p>
        </div>
        <div className="stat-card">
          <h3>Назначено</h3>
          <p className="stat-number">{stats?.assigned}</p>
        </div>
        <div className="stat-card">
          <h3>Писем</h3>
          <p className="stat-number">{stats?.letters}</p>
        </div>
      </div>

      <div className="admin-actions">
        <button onClick={runFullDistribution} className="btn-primary" disabled={busy}>
          {busy ? 'Работаю...' : stats?.assigned > 0 ? 'Перераспределить всех' : 'Распределить'}
        </button>
        <button onClick={addNewcomers} className="btn-secondary"
          disabled={busy || unassignedCount === 0} style={{ marginBottom: 0 }}>
          + Добавить новичков ({unassignedCount})
        </button>
        <button onClick={resetDistribution} className="btn-danger" disabled={busy}>
          Сбросить всё
        </button>
      </div>

      <div className="users-table-container">
        <h2>Пользователи</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Регион</th>
              <th>Анкета</th>
              <th>Назначен</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td style={{ fontSize: 13 }}>{user.email}</td>
                <td>{user.region || '—'}</td>
                <td>{user.profileCompleted ? '✓' : '✗'}</td>
                <td>{user.assignedTo ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
