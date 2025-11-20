import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';

  const removeFloating = () => {
    document.querySelectorAll('[style*="position: fix"] [style*="bottom: 1rem"] [style*="right: 1rem"] [style*="z-index: 2147483647"]').forEach(el => el.remove());
  };

removeFloating();

const observer = new MutationObserver(removeFloating);
observer.observe(document.body, { childList: true, subtree: true});

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Carregando...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthForm />;
}

export default App;
