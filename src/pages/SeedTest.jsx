import { useState } from 'react';
import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/App.css';

const FIRST_NAMES = [
  'Александр', 'Максим', 'Артём', 'Иван', 'Дмитрий', 'Кирилл', 'Никита', 'Даниил',
  'Егор', 'Андрей', 'Владислав', 'Роман', 'Тимофей', 'Сергей', 'Николай', 'Владимир',
  'Анна', 'Мария', 'Екатерина', 'Ольга', 'Елена', 'Наталья', 'Дарья', 'Анастасия',
  'Ирина', 'Татьяна', 'Светлана', 'Юлия', 'Алиса', 'Полина', 'Виктория', 'Ксения',
  'Алексей', 'Павел', 'Денис', 'Глеб', 'Матвей', 'Лев', 'Ярослав', 'Михаил',
  'София', 'Валерия', 'Арина', 'Варвара', 'Елизавета', 'Алёна', 'Маргарита', 'Вероника',
  'Пётр', 'Георгий', 'Семён', 'Фёдор', 'Тимур', 'Арсений', 'Марк', 'Мирослав',
  'Василиса', 'Милана', 'Евгения', 'Ульяна', 'Любовь', 'Надежда', 'Александра', 'Таисия'
];

const LAST_NAMES = [
  'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Зайцев',
  'Соколов', 'Михайлов', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов',
  'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров',
  'Иванова', 'Петрова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Зайцева',
  'Соколова', 'Михайлова', 'Фёдорова', 'Морозова', 'Волкова', 'Алексеева', 'Лебедева'
];

const REGIONS = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону', 'Уфа', 'Красноярск', 'Воронеж',
  'Пермь', 'Волгоград', 'Краснодар', 'Тюмень', 'Иркутск', 'Владивосток', 'Хабаровск'
];

const BIOS = [
  'Люблю путешествовать и открывать новые места.',
  'Увлекаюсь фотографией, особенно люблю снимать закаты.',
  'Занимаюсь волонтёрством и помогаю приютам для животных.',
  'Обожаю читать классическую литературу.',
  'Профессиональный музыкант, играю на фортепиано и гитаре.',
  'Спорт — моя жизнь. Бегаю марафоны и занимаюсь йогой.',
  'Программист по профессии, художник в душе.',
  'Обожаю готовить и экспериментировать с рецептами.',
  'Заядлый путешественник, объездил 30 стран.',
  'Студент медицинского университета.',
  'Пишу стихи и короткие рассказы.',
  'Люблю активный отдых: походы, скалолазание, сплавы по рекам.'
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SeedTest = () => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const generateUsers = async () => {
    setBusy(true);
    setMessage('');

    try {
      const ids = [];
      for (let i = 0; i < 89; i++) {
        const firstName = random(FIRST_NAMES);
        const lastName = random(LAST_NAMES);
        const fullName = `${firstName} ${lastName}`;
        const uid = `test-uid-${Date.now()}-${i}`;
        ids.push(uid);
        await setDoc(doc(db, 'users', uid), {
          uid,
          email: `test.user${i}.${Date.now()}@example.com`,
          fullName,
          region: random(REGIONS),
          bio: random(BIOS),
          profileCompleted: true,
          createdAt: new Date().toISOString()
        });
      }

      setMessage(`Создано 89 тестовых пользователей!`);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
    }
    setBusy(false);
  };

  const cleanUsers = async () => {
    if (!window.confirm('Удалить всех тестовых пользователей?')) return;
    setBusy(true);
    setMessage('');

    try {
      const snap = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((d) => {
        if (d.id.startsWith('test-uid-')) {
          batch.delete(doc(db, 'users', d.id));
          count++;
        }
      });
      await batch.commit();
      setMessage(`Удалено ${count} тестовых пользователей`);
    } catch (err) {
      setMessage('Ошибка: ' + err.message);
    }
    setBusy(false);
  };

  return (
    <div className="page-content">
      <h1 style={{ color: '#e2e8f0', marginBottom: 20 }}>Seed Test</h1>

      {message && (
        <div className={message.includes('Ошибка') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button onClick={generateUsers} className="btn-primary" disabled={busy}>
          {busy ? 'Генерация...' : 'Создать 89 тестовых'}
        </button>
        <button onClick={cleanUsers} className="btn-danger" disabled={busy}>
          Очистить тестовых
        </button>
      </div>
    </div>
  );
};

export default SeedTest;
