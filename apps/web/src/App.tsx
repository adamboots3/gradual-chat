import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
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

  if (!token) return <LoginPage onAuthenticated={handleAuthenticated} />;

  return <ChatPage token={token} onSignOut={handleSignOut} />;
}
