import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import './styles/App.css';

const ProtectedRoute = ({ children }) => {
  const { currentUser, resendVerification } = useAuth();
  const [resent, setResent] = useState(false);

  if (!currentUser) return <Navigate to="/login" />;

  if (!currentUser.emailVerified) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 className="logo">Подтвердите email</h1>
          <p style={{ color: '#94a3b8', marginBottom: 12 }}>
            Письмо отправлено на <strong>{currentUser.email}</strong>
          </p>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
            Нажмите на ссылку в письме, затем обновите страницу.
          </p>
          <button
            className="btn-secondary"
            style={{ marginBottom: 12, width: '100%' }}
            onClick={async () => {
              try {
                await resendVerification();
                setResent(true);
                setTimeout(() => setResent(false), 5000);
              } catch {}
            }}
          >
            {resent ? 'Отправлено ✓' : 'Выслать письмо ещё раз'}
          </button>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Я подтвердил, обновить
          </button>
        </div>
      </div>
    );
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser?.emailVerified ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
