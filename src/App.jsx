import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import AutoUnpublishOnAttorneyNavigation from '@/components/present/AutoUnpublishOnAttorneyNavigation';

// Page imports
import Dashboard from '@/pages/Dashboard';
import ProofVault from '@/pages/ProofVault';
import Parties from '@/pages/Parties';
import ExamBuilder from '@/pages/ExamBuilder';
import AttorneyView from '@/pages/AttorneyView';
import JuryView from '@/pages/JuryView';
import AttorneyViewShell from '@/components/present/AttorneyViewShell';
import Settings from '@/pages/Settings';
import AttorneyHub from '@/pages/AttorneyHub';
import ExamBuilderV2 from '@/pages/ExamBuilderV2';
import ExamTextImport from '@/pages/ExamTextImport';
import WitnessMarkup from '@/pages/WitnessMarkup';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/ProofVault" element={<ProofVault />} />
        <Route path="/Parties" element={<Parties />} />
        <Route path="/ExamBuilder" element={<ExamBuilder />} />
        <Route path="/ExamBuilderV2" element={<ExamBuilderV2 />} />
        <Route path="/ExamTextImport" element={<ExamTextImport />} />
        <Route path="/AttorneyHub" element={<AttorneyHub />} />
        <Route path="/Settings" element={<Settings />} />
      </Route>
      
      <Route path="/AttorneyView" element={<Navigate to="/present/attorney" replace />} />
      <Route path="/JuryView" element={<Navigate to="/present/jury" replace />} />
      <Route path="/present/hub" element={<Navigate to="/AttorneyHub" replace />} />
      <Route path="/present/exam-builder-v2" element={<Navigate to="/ExamBuilderV2" replace />} />
      <Route path="/present/attorney" element={<AttorneyViewShell />} />
      <Route path="/present/jury" element={<JuryView />} />
      <Route path="/WitnessMarkup" element={<WitnessMarkup />} />
      
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AutoUnpublishOnAttorneyNavigation />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App