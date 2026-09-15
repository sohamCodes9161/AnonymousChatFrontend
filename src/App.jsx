import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme/ThemeProvider.jsx';
import { AuthBootstrap } from './features/auth/AuthBootstrap.jsx';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { RegisterPage } from './features/auth/RegisterPage.jsx';
import { ChatLayout } from './features/layout/ChatLayout.jsx';
import { EmptyChatState } from './features/layout/EmptyChatState.jsx';
import { ConversationView } from './features/chats/ConversationView.jsx';
import { ToastContainer } from './components/ToastContainer.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthBootstrap>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/chats"
                element={
                  <ProtectedRoute>
                    <ChatLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<EmptyChatState />} />
                <Route path=":chatId" element={<ConversationView />} />
              </Route>
              <Route path="*" element={<Navigate to="/chats" replace />} />
            </Routes>
          </AuthBootstrap>
          <ToastContainer />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
