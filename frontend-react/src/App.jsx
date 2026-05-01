import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import OntologyExplorer from './pages/OntologyExplorer'
import EntityNetwork from './pages/EntityNetwork'
import Analytics from './pages/Analytics'
import Contagion from './pages/Contagion'
import Learning from './pages/Learning'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ontology" element={<OntologyExplorer />} />
        <Route path="/entities" element={<EntityNetwork />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/contagion" element={<Contagion />} />
        <Route path="/learning" element={<Learning />} />
      </Routes>
    </Layout>
  )
}
