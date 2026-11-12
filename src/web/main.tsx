import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ChecklistPage } from './features/checklist/ChecklistPage'
import { KanbanPage } from './features/kanban/KanbanPage'
import { MapPage } from './features/map/MapPage'
import { InboxPage } from './features/inbox/InboxPage'
import { MessagesPage } from './features/messages/MessagesPage'
import { PropertyPage } from './features/properties/PropertyPage'
import { RankingPage } from './features/ranking/RankingPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { SharedPage } from './features/share/SharedPage'
import { SharesPage } from './features/share/SharesPage'
import { VisitsPage } from './features/visits/VisitsPage'
import { Toaster } from './components/Toaster'
import { AuthGate } from './features/auth/AuthGate'
import { Layout } from './Layout'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Vista pública para invitados: sin menú ni login */}
          <Route path="c/:token" element={<SharedPage />} />
          <Route
            element={
              <AuthGate>
                <Layout />
              </AuthGate>
            }
          >
            <Route index element={<RankingPage />} />
            <Route path="mapa" element={<MapPage />} />
            <Route path="procesos" element={<KanbanPage />} />
            <Route path="visitas" element={<VisitsPage />} />
            <Route path="pendientes" element={<InboxPage />} />
            <Route path="mensajes" element={<MessagesPage />} />
            <Route path="checklist" element={<ChecklistPage />} />
            <Route path="ajustes" element={<SettingsPage />} />
            <Route path="compartidos" element={<SharesPage />} />
            <Route path="p/:id" element={<PropertyPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
