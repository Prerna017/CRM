import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { UserProfile, UserRole, EmployeeStatus } from '../types/database';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Sales');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [salary, setSalary] = useState<number>(85000);
  const [annualQuota, setAnnualQuota] = useState<number>(18);
  const [sickQuota, setSickQuota] = useState<number>(10);
  const [casualQuota, setCasualQuota] = useState<number>(8);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await crmService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setName('');
    setEmail('');
    setTitle('');
    setDepartment('Sales');
    setPhone('');
    setRole('employee');
    setSalary(85000);
    setAnnualQuota(18);
    setSickQuota(10);
    setCasualQuota(8);
    setCreateModalOpen(true);
  };

  const openEditModal = (emp: UserProfile) => {
    setSelectedEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setTitle(emp.title);
    setDepartment(emp.department);
    setPhone(emp.phone || '');
    setRole(emp.role);
    setSalary(emp.salary || 0);
    setAnnualQuota(emp.annual_leave_quota);
    setSickQuota(emp.sick_leave_quota);
    setCasualQuota(emp.casual_leave_quota);
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !title) {
      showToast('Name, Email, and Title are required', 'error');
      return;
    }

    try {
      await crmService.createEmployee({
        name,
        email,
        title,
        department,
        phone,
        role,
        salary: Number(salary),
        status: 'active',
        join_date: new Date().toISOString().split('T')[0],
        annual_leave_quota: Number(annualQuota),
        sick_leave_quota: Number(sickQuota),
        casual_leave_quota: Number(casualQuota),
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
      });

      showToast(`Employee ${name} added to roster!`, 'success');
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create employee', 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      await crmService.updateEmployee(selectedEmployee.id, {
        name,
        title,
        department,
        phone,
        role,
        salary: Number(salary),
        annual_leave_quota: Number(annualQuota),
        sick_leave_quota: Number(sickQuota),
        casual_leave_quota: Number(casualQuota)
      });

      showToast('Employee profile updated successfully', 'success');
      setEditModalOpen(false);
      setSelectedEmployee(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee', 'error');
    }
  };

  const handleDeactivate = async (emp: UserProfile) => {
    if (emp.id === user?.id) {
      showToast('You cannot deactivate your own account', 'error');
      return;
    }
    if (!window.confirm(`Deactivate account for ${emp.name}?`)) return;

    try {
      await crmService.deleteEmployee(emp.id);
      showToast(`${emp.name} marked as inactive`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate', 'error');
    }
  };

  const departments = ['all', 'Executive', 'Sales', 'Engineering', 'Marketing', 'Operations'];

  const filteredEmployees = employees.filter((emp) => {
    if (selectedDept !== 'all' && emp.department.toLowerCase() !== selectedDept.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.title.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isAdmin ? 'Employee Directory & Roster' : 'Company Team Directory'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin
              ? 'Complete company roster, payroll rates, leave quotas, and role permissions.'
              : 'Connect with colleagues across engineering, sales, marketing, and operations.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all w-fit"
          >
            <Plus size={16} />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, role, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                selectedDept === dept
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}
                    alt={emp.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-sm"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{emp.name}</h3>
                    <p className="text-xs text-indigo-400 font-medium mt-0.5">{emp.title}</p>
                    <span className="text-[10px] text-slate-400">{emp.department}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    emp.role === 'admin'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                  }`}
                >
                  {emp.role === 'admin' ? 'Founder' : 'Staff'}
                </span>
              </div>

              {/* Contact Details */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail size={13} className="text-slate-500" />
                  <a href={`mailto:${emp.email}`} className="hover:text-indigo-400 truncate">
                    {emp.email}
                  </a>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone size={13} className="text-slate-500" />
                    <span>{emp.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar size={13} className="text-slate-500" />
                  <span>Joined {formatDate(emp.join_date)}</span>
                </div>
                {isAdmin && emp.salary !== undefined && (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <DollarSign size={13} />
                    <span>{formatCurrency(emp.salary)} / yr</span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Action Buttons */}
            {isAdmin && (
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    emp.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {emp.status}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                    title="Edit profile & salary"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  {emp.id !== user?.id && (
                    <button
                      onClick={() => handleDeactivate(emp)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs"
                      title="Deactivate employee"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add New Employee</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jessica Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="jessica@vingo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full Stack Developer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Founder / Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Salary ($)</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Vacation Quota (Days)</label>
                  <input
                    type="number"
                    value={annualQuota}
                    onChange={(e) => setAnnualQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Edit Profile: {selectedEmployee.name}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Job Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Founder / Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Salary ($)</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Leave Quota</label>
                  <input
                    type="number"
                    value={annualQuota}
                    onChange={(e) => setAnnualQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
