import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Loader } from './Loader';

export const Layout: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f7f5ed]">
      <Loader hidden={!loading} />
      <Sidebar />
      <main className="flex-1 h-screen p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="text-sm">
            <span className="text-slate-500">Panel /</span> <strong className="text-slate-800">Dashboard</strong>
          </div>
          <div className="text-xs font-medium text-slate-600">Administrador</div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};