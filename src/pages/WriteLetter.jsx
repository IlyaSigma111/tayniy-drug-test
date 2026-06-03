import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createLetterNotification } from '../lib/notifications';
import '../styles/App.css';

const MAX_LINKS = 5;

const WriteLetter = ({ recipient }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [links, setLinks] = useState(['']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!recipient) {
    return (
      <div className="page-content">
        <h1 style={{ color: '#e2e8f0', marginBottom: 20 }}>Написать письмо</h1>
        <div className="info-card">
          <p>Вам ещё не назначен получатель. Ожидайте распределения.</p>
        </div>
      </div>
    );
  }

  const handleLinkChange = (index, value) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const addLink = () => {
    if (links.length < MAX_LINKS) {
      setLinks([...links, '']);
    }
  };

  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const getLinkType = (url) => {
    if (!url) return null;
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const videoExts = ['.mp4', '.webm', '.mov', '.avi'];
    const lower = url.toLowerCase();
    if (imageExts.some(ext => lower.includes(ext))) return 'image';
    if (videoExts.some(ext => lower.includes(ext))) return 'video';
    return 'link';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (text.length < 50) {
      setError('Текст письма должен содержать минимум 50 символов');
      return;
    }

    if (text.length > 10000) {
      setError('Текст письма не должен превышать 10000 символов');
      return;
    }

    const validLinks = links.filter(l => l.trim());
    setSending(true);

    try {
      const attachments = validLinks.map(url => ({
        url: url.trim(),
        type: getLinkType(url) || 'link',
        name: url.trim().split('/').pop() || 'Вложение'
      }));

      await addDoc(collection(db, 'letters'), {
        from: currentUser.uid,
        to: recipient.id,
        text,
        attachments,
        read: false,
        createdAt: serverTimestamp()
      });

      createLetterNotification(recipient.id);

      navigate('/dashboard/letters');
    } catch (err) {
      setError('Ошибка при отправке: ' + err.message);
    }
    setSending(false);
  };

  return (
    <div className="page-content">
      <h1 style={{ color: '#e2e8f0', marginBottom: 20 }}>Написать письмо для {recipient.fullName}</h1>

      <div className="recipient-preview">
        <p><strong>Регион:</strong> {recipient.region || 'Не указан'}</p>
        <p><strong>О себе:</strong> {recipient.bio}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="letter-form">
        <div className="form-group">
          <label>Текст письма *</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Напишите слова поддержки и мотивации..."
            required
          />
          <span className="char-count">{text.length} / 10000 (минимум 50)</span>
        </div>

        <div className="form-group">
          <label>Ссылки Яндекс.Диска (макс. {MAX_LINKS})</label>
          <div className="yandex-link-input">
            {links.map((link, index) => (
              <div key={index} className="link-row">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                  placeholder="https://disk.yandex.ru/i/..."
                />
                {links.length > 1 && (
                  <button type="button" onClick={() => removeLink(index)} className="btn-remove">✕</button>
                )}
              </div>
            ))}
            {links.length < MAX_LINKS && (
              <button type="button" onClick={addLink} className="btn-secondary" style={{ marginBottom: 0 }}>
                + Добавить ссылку
              </button>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={sending}>
          {sending ? 'Отправка...' : 'Отправить письмо'}
        </button>
      </form>
    </div>
  );
};

export default WriteLetter;
