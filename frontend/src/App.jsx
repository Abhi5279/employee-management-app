import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import EmployeeStats from './components/EmployeeStats';
import EmployeeTable from './components/EmployeeTable';
import EmployeeModal from './components/EmployeeModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import Toast from './components/Toast';
import { api } from './services/api';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [isSeeding, setIsSeeding] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Sync dark mode class with root html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await api.getStats();
      setStats(statsData);
    } catch (err) {
      console.warn('Could not load stats:', err.message);
    }
  }, []);

  // Load employees
  const loadEmployees = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const result = await api.getEmployees({
        search,
        department,
        sortBy,
        order,
      });
      setEmployees(result.data || []);
      setServerStatus('connected');
    } catch (err) {
      console.error('Failed to load employees:', err);
      setServerStatus('offline');
      if (!isSilent) {
        showToast(err.message || 'Could not connect to backend server', 'error');
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [search, department, sortBy, order]);

  // Initial load & check health
  useEffect(() => {
    const init = async () => {
      const health = await api.checkHealth();
      if (health.status === 'healthy') {
        setServerStatus('connected');
      } else {
        setServerStatus('offline');
      }
      await Promise.all([loadEmployees(), loadStats()]);
    };
    init();
  }, []);

  // Reload when query options change (debounced for search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEmployees(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, department, sortBy, order, loadEmployees]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadEmployees(false), loadStats()]);
    setIsRefreshing(false);
    showToast('Data refreshed successfully', 'info');
  };

  // Create or Update Employee
  const handleSaveEmployee = async (formData) => {
    if (editingEmployee) {
      const id = editingEmployee._id || editingEmployee.id;
      const res = await api.updateEmployee(id, formData);
      showToast(`Updated '${formData.name}' successfully!`, 'success');
    } else {
      const res = await api.createEmployee(formData);
      showToast(`Added '${formData.name}' successfully!`, 'success');
    }
    await Promise.all([loadEmployees(true), loadStats()]);
  };

  // Delete Employee
  const handleConfirmDelete = async (id) => {
    await api.deleteEmployee(id);
    showToast('Employee record deleted', 'info');
    await Promise.all([loadEmployees(true), loadStats()]);
  };

  // Seed sample data
  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      const res = await api.seedDemoEmployees(true);
      showToast(res.message || 'Sample employees populated!', 'success');
      await Promise.all([loadEmployees(false), loadStats()]);
    } catch (err) {
      showToast(err.message || 'Failed to seed demo data', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Open modal for new employee
  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Navigation */}
      <Navbar
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenAddModal={handleOpenAdd}
        onSeedData={handleSeedData}
        serverStatus={serverStatus}
        isSeeding={isSeeding}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Employee Management Directory
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Containerized MERN Stack with Express REST API, MongoDB Volume Persistence & Custom Networks.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Dashboard Metric Overview Cards */}
        <EmployeeStats stats={stats} />

        {/* Employee Directory Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Team Directory
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {employees.length} {employees.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          {/* Table / Cards View */}
          <EmployeeTable
            employees={employees}
            isLoading={isLoading}
            search={search}
            setSearch={setSearch}
            department={department}
            setDepartment={setDepartment}
            sortBy={sortBy}
            setSortBy={setSortBy}
            order={order}
            setOrder={setOrder}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onEdit={handleOpenEdit}
            onDelete={(emp) => setDeletingEmployee(emp)}
            onOpenAddModal={handleOpenAdd}
            onSeedData={handleSeedData}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>
            StaffPulse Prototype &bull; MERN Stack (React, Express, Node.js, MongoDB) &bull; Docker Containerized
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Docker Compose Multi-Container
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Isolated Custom Network
            </span>
          </div>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveEmployee}
        employee={editingEmployee}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingEmployee)}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleConfirmDelete}
        employee={deletingEmployee}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
}
