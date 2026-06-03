import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export function createLetterNotification(recipientId) {
  return addDoc(collection(db, 'notifications'), {
    userId: recipientId,
    type: 'letter',
    title: 'Новое письмо',
    body: 'Вам пришло новое анонимное письмо!',
    read: false,
    createdAt: serverTimestamp()
  });
}

export function createDistributionNotification(userId) {
  return addDoc(collection(db, 'notifications'), {
    userId,
    type: 'distribution',
    title: 'Распределение',
    body: 'Вам назначен получатель! Напишите ему письмо.',
    read: false,
    createdAt: serverTimestamp()
  });
}

export function subscribeToNotifications(userId, onData) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error('Notifications error:', err);
    onData([]);
  });
}

export function markNotificationRead(notifId) {
  return updateDoc(doc(db, 'notifications', notifId), { read: true });
}
