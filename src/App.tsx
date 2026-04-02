import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuestRoute from "@/components/GuestRoute";
import AdminRoute from "@/components/admin/AdminRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Articles from "./pages/Articles";
import SignUp from "./pages/SignUp";
import SignUpAccount from "./pages/SignUpAccount";
import Onboarding from "./pages/Onboarding";
import DashboardSeeker from "./pages/DashboardSeeker";
import SubscriptionSelect from "./pages/SubscriptionSelect";
import ProviderPayment from "./pages/ProviderPayment";
import ProviderPending from "./pages/ProviderPending";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OpportunitiesBrowse from "./pages/OpportunitiesBrowse";
import OpportunityDetails from "./pages/OpportunityDetails";
import HireTalent from "./pages/HireTalent";
import TechnicalWriting from "./pages/TechnicalWriting";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Seeker dashboard sub-pages
import Explore from "./pages/dashboard/seeker/Explore";
import AppliedJobs from "./pages/dashboard/seeker/AppliedJobs";
import SavedJobs from "./pages/dashboard/seeker/SavedJobs";
import Notifications from "./pages/dashboard/seeker/Notifications";
import ProfileInfo from "./pages/dashboard/seeker/ProfileInfo";
import PasswordSecurity from "./pages/dashboard/seeker/PasswordSecurity";

// Provider dashboard
import ProviderLayout from "./components/dashboard/provider/ProviderLayout";
import ProviderHome from "./pages/dashboard/provider/ProviderHome";
import Opportunities from "./pages/dashboard/provider/Opportunities";
import Applicants from "./pages/dashboard/provider/Applicants";
import ProviderMessages from "./pages/dashboard/provider/Messages";
import ProviderDocuments from "./pages/dashboard/provider/Documents";
import ProviderSubscription from "./pages/dashboard/provider/Subscription";
import ProviderTeam from "./pages/dashboard/provider/Team";
import ProviderSettings from "./pages/dashboard/provider/ProviderSettings";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProviders from "./pages/admin/AdminProviders";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminContentManagement from "./pages/admin/AdminContentManagement";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminOpportunities from "./pages/admin/AdminOpportunities";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCreateOpportunity from "./pages/admin/AdminCreateOpportunity";
import AdminProviderDetail from "./pages/admin/AdminProviderDetail";
import AdminSettings from "./pages/admin/AdminSettings";
import ArticleDetail from "./pages/ArticleDetail";

// Auth pages
import AuthCallback from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/opportunities" element={<OpportunitiesBrowse />} />
            <Route path="/opportunities/:id" element={<OpportunityDetails />} />
            <Route path="/services/hire-talent" element={<HireTalent />} />
            <Route path="/services/technical-writing" element={<TechnicalWriting />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Guest-only routes */}
            <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />
            <Route path="/signup/account" element={<GuestRoute><SignUpAccount /></GuestRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Auth required */}
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/auth/callback" element={<AuthCallback></AuthCallback>} />

            {/* Provider subscription flow */}
            <Route path="/provider/subscribe" element={<ProtectedRoute><SubscriptionSelect /></ProtectedRoute>} />
            <Route path="/provider/payment" element={<ProtectedRoute><ProviderPayment /></ProtectedRoute>} />
            <Route path="/provider/pending" element={<ProtectedRoute><ProviderPending /></ProtectedRoute>} />

            {/* Seeker dashboard with sub-routes */}
            <Route path="/dashboard/seeker" element={<ProtectedRoute requireComplete><DashboardSeeker /></ProtectedRoute>}>
              <Route index element={<Explore />} />
              <Route path="applied-jobs" element={<AppliedJobs />} />
              <Route path="saved-jobs" element={<SavedJobs />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<ProfileInfo />} />
              <Route path="security" element={<PasswordSecurity />} />
            </Route>

            {/* Provider dashboard with sub-routes */}
            <Route path="/dashboard/provider" element={<ProtectedRoute requireComplete><ProviderLayout /></ProtectedRoute>}>
              <Route index element={<ProviderHome />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="applicants" element={<Applicants />} />
              <Route path="messages" element={<ProviderMessages />} />
              <Route path="documents" element={<ProviderDocuments />} />
              <Route path="subscription" element={<ProviderSubscription />} />
              <Route path="team" element={<ProviderTeam />} />
              <Route path="settings" element={<ProviderSettings />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>

            {/* Admin panel */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminRoute requiredRole="admin"><AdminUsers /></AdminRoute>} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="providers/:id" element={<AdminProviderDetail />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="content" element={<AdminContentManagement />} />
              <Route path="opportunities" element={<AdminRoute requiredRole="editor"><AdminOpportunities /></AdminRoute>} />
              <Route path="opportunities/create" element={<AdminRoute requiredRole="editor"><AdminCreateOpportunity /></AdminRoute>} />
              <Route path="submissions" element={<AdminSubmissions />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminRoute requiredRole="admin"><AdminSettings /></AdminRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
