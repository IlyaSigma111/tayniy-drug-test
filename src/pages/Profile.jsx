import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/App.css';

const Profile = () => {
  const { currentUser, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    region: '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [profileLocked, setProfileLocked] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          fullName: data.fullName || '',
          region: data.region || '',
          bio: data.bio || ''
        });
        setProfileLocked(!!data.distributionLocked);
      }
      setLoading(false);
    };
    loadProfile();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.bio.length > 2000) {
      setMessage('Биография не должна превышать 2000 символов');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await updateProfile({
        ...formData,
        profileCompleted: true
      });
      setMessage('Анкета успешно сохранена!');
    } catch (err) {
      setMessage('Ошибка при сохранении: ' + err.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="profile-page">
      <h1>Моя анкета</h1>

      {profileLocked && (
        <div className="warning-banner">
          Анкета заблокирована для редактирования после распределения.
        </div>
      )}

      {message && (
        <div className={message.includes('Ошибка') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>ФИО *</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            disabled={profileLocked}
          />
        </div>

        <div className="form-group">
          <label>Регион</label>
          <input
            type="text"
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            placeholder="Например: Москва, Санкт-Петербург"
            disabled={profileLocked}
          />
        </div>

        <div className="form-group">
          <label>Биография *</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            maxLength={2000}
            rows={5}
            placeholder="Расскажите о себе, своих интересах и хобби..."
            required
            disabled={profileLocked}
          />
          <span className="char-count">{formData.bio.length} / 2000</span>
        </div>


        {!profileLocked && (
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить анкету'}
          </button>
        )}
      </form>
    </div>
  );
};

export default Profile;
