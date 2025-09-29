import { Routes, Route } from 'react-router-dom';
import LinksPage from './pages/LinksPage.tsx';
import LinkDetailPage from './pages/LinkDetailPage.tsx';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>URL Shortener</h1>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<LinksPage />} />
          <Route path="/links/:id" element={<LinkDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;