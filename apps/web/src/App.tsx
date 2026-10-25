import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatPage } from './pages/ChatPage';
import { apolloClient, getStoredUserId, storeUserId } from './lib/apollo';
import type { User } from './types';

export default function App() {
  const [userId, setUserId] = useState<string | null>(() => getStoredUserId());

  const handleSignedIn = (user: User) => {
    storeUserId(user.id);
    setUserId(user.id);
  };

  const handleSignOut = () => {
    storeUserId(null);
    setUserId(null);
    void apolloClient.clearStore();
  };

  return (
    <ErrorBoundary>
      {userId ? (
        <ChatPage userId={userId} onSignOut={handleSignOut} />
      ) : (
        <LoginPage onSignedIn={handleSignedIn} />
      )}
    </ErrorBoundary>
  );
}
