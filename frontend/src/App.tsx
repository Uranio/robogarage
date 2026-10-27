import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TermLayout from './components/TermLayout';
import Landing from './pages/Landing';
import Skills from './pages/Skills';
import Import from './pages/Import';
import Plugins from './pages/Plugins';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Docs from './pages/Docs';
import Login from './pages/Login';
import Register from './pages/Register';
import Recover from './pages/Recover';
import Reset from './pages/Reset';
import NewRepo from './pages/NewRepo';
import RepoDetail from './pages/RepoDetail';
import { Navigate } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<TermLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/import" element={<Import />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover" element={<Recover />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/new" element={<NewRepo />} />
          <Route path="/r/:id" element={<RepoDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
