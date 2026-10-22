import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatPage } from './pages/ChatPage';
import { getStoredToken, storeToken } from './lib/apollo';

export default function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const handleAuthenticated = (nextToken: string) => {
    storeToken(nextToken);
    setToken(nextToken);
  };

  const handleSignOut = () => {
    storeToken(null);
    setToken(null);
  };

  return (
    <ErrorBoundary>
      {token ? (
        <ChatPage token={token} onSignOut={handleSignOut} />
      ) : (
        <LoginPage onAuthenticated={handleAuthenticated} />
      )}
    </ErrorBoundary>
  );
}
