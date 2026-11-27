import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import Painel from './components/Painel'
import Auditoria from './pages/Auditoria'
import Login from './pages/Login'
import Respostas from './pages/Respostas'
import { lerSessao } from './lib/sessao'
import Indicadores from './pages/Indicadores'
import Pesquisa from './pages/Pesquisa'
import Parametros from './pages/Parametros'

function RotaPrivada({ children }: { children: ReactNode }) {
  if (!lerSessao()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/auditoria"
        element={
          <RotaPrivada>
            <Painel>
              <Auditoria />
            </Painel>
          </RotaPrivada>
        }
      />
      <Route
        path="/respostas"
        element={
          <RotaPrivada>
            <Painel>
              <Respostas />
            </Painel>
          </RotaPrivada>
        }
      />
      <Route
        path="/indicadores"
        element={
          <RotaPrivada>
            <Painel>
              <Indicadores />
            </Painel>
          </RotaPrivada>
        }
      />
      <Route
        path="/nova-pesquisa"
        element={
          <RotaPrivada>
            <Painel>
              <Pesquisa />
            </Painel>
          </RotaPrivada>
        }
      />
      <Route
        path="/parametros-e-formulas"
        element={
          <RotaPrivada>
            <Painel>
              <Parametros />
            </Painel>
          </RotaPrivada>
        }
      />
      <Route path="/" element={<Navigate to="/auditoria" replace />} />
      <Route path="*" element={<Navigate to="/auditoria" replace />} />
    </Routes>
  )
}
