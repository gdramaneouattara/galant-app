import React from 'react';
import { Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  MessageSquare,
  AlertCircle,
  Settings,
  ChevronRight,
  Gem,
  CreditCard
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // Sécurité : Si pas admin, retour à l'accueil
  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Membres' },
    { path: '/admin/pricing', icon: Settings, label: 'Tarifs' },
    { path: '/admin/kyc', icon: ShieldCheck, label: 'KYC' },
    { path: '/admin/support', icon: MessageSquare, label: 'Support' },
    { path: '/admin/finances', icon: CreditCard, label: 'Finances' },
    { path: '/admin/reports', icon: AlertCircle, label: 'Alertes' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-slate-900 text-white fixed h-full z-50 flex flex-col">
        <div className="p-8">
          <h1 className="text-2xl font-black text-primary tracking-tighter flex items-center gap-2 italic">
            GALANT <span className="bg-primary/20 text-[10px] text-primary px-2 py-0.5 rounded border border-primary/30 not-italic tracking-normal">ADMIN</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between p-4 rounded-2xl transition-all group ${
                location.pathname === item.path
                  ? 'bg-primary text-white shadow-lg shadow-red-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="font-bold text-sm">{item.label}</span>
              </div>
              <ChevronRight size={14} className={location.pathname === item.path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-black">
              {profile.name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black truncate">{profile.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenu Principal */}
      <main className="flex-1 ml-64 p-10">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
