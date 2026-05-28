import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/App.css';

const Letters = () => {
  const { currentUser } = useAuth();
  const [letters, setLetters] = useState([]);
  const [sentLetters, setSentLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [error, setError] = useState('');

  const unsubReceived = useRef(null);
  const unsubSent = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    const receivedQuery = query(
      collection(db, 'letters'),
      where('to', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const sentQuery = query(
      collection(db, 'letters'),
      where('from', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    unsubReceived.current = onSnapshot(receivedQuery,
      (snap) => {
        const received = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLetters(received);
        setLoading(false);
      },
      (err) => {
        setError('Ошибка загрузки писем. Возможно, нужно создать индексы в Firebase Console.');
        console.error('Ошибка получения писем:', err);
        setLoading(false);
      }
    );

    unsubSent.current = onSnapshot(sentQuery,
      (snap) => {
        const sent = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSentLetters(sent);
      },
      (err) => console.error('Ошибка получения отправленных:', err)
    );

    return () => {
      if (unsubReceived.current) unsubReceived.current();
      if (unsubSent.current) unsubSent.current();
    };
  }, [currentUser]);

  const markAsRead = async (letterId) => {
    try {
      await updateDoc(doc(db, 'letters', letterId), { read: true });
    } catch (err) {
      console.error('Ошибка обновления:', err);
    }
  };

  const handleView = async (letter) => {
    setSelectedLetter(letter);
    if (!letter.read) {
      await markAsRead(letter.id);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Неизвестно';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <div className="loading">Загрузка писем...</div>;

  if (selectedLetter) {
    return (
      <div className="page-content">
        <button onClick={() => setSelectedLetter(null)} className="btn-secondary">← Назад</button>
        <div className="letter-detail">
          <h2>Письмо от тайного друга</h2>
          <p className="letter-date">Получено: {formatDate(selectedLetter.createdAt)}</p>
          <div className="letter-text">{selectedLetter.text}</div>
          {selectedLetter.attachments?.length > 0 && (
            <div className="letter-attachments">
              <h3>Вложения:</h3>
              <div className="attachments-grid">
                {selectedLetter.attachments.map((file, i) => (
                  <div key={i} className="attachment-preview">
                    {file.type === 'image' ? (
                      <img src={file.url} alt={file.name} />
                    ) : file.type === 'video' ? (
                      <video controls src={file.url} />
                    ) : (
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-download">Открыть ссылку</a>
                    )}
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-download">Открыть</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1 style={{ color: '#e2e8f0', marginBottom: 20 }}>Мои письма</h1>
      {error && <div className="warning-banner">{error}</div>}

      <div className="letters-section">
        <h2>Входящие ({letters.length})</h2>
        {letters.length === 0 ? (
          <p className="empty-state">У вас пока нет писем</p>
        ) : (
          <div className="letters-list">
            {letters.map(letter => (
              <div key={letter.id} className={`letter-item ${!letter.read ? 'unread' : ''}`} onClick={() => handleView(letter)}>
                <div className="letter-preview">
                  <span className="letter-icon">✉</span>
                  <div className="letter-info">
                    <p className="letter-excerpt">{letter.text.substring(0, 100)}...</p>
                    <span className="letter-date">{formatDate(letter.createdAt)}</span>
                  </div>
                  {!letter.read && <span className="unread-badge">Новое</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="letters-section">
        <h2>Отправленные ({sentLetters.length})</h2>
        {sentLetters.length === 0 ? (
          <p className="empty-state">Вы ещё не отправляли писем</p>
        ) : (
          <div className="letters-list">
            {sentLetters.map(letter => (
              <div key={letter.id} className="letter-item sent">
                <div className="letter-preview">
                  <span className="letter-icon">↗</span>
                  <div className="letter-info">
                    <p className="letter-excerpt">{letter.text.substring(0, 100)}...</p>
                    <span className="letter-date">{formatDate(letter.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Letters;
