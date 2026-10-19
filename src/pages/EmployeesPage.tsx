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
  Calendar,
  DollarSign,
  MapPin,
  HeartPulse,
  UserCheck,
  Lock,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalEmployee, setViewModalEmployee] = useState<UserProfile | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [workLocation, setWorkLocation] = useState('Headquarters (San Francisco)');
  const [reportingManagerId, setReportingManagerId] = useState<string>('');
  const [role, setRole] = useState<UserRole>('employee');
  const [empStatus, setEmpStatus] = useState<EmployeeStatus>('active');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [salary, setSalary] = useState<number>(85000);
  const [annualQuota, setAnnualQuota] = useState<number>(18);
  const [sickQuota, setSickQuota] = useState<number>(10);
  const [casualQuota, setCasualQuota] = useState<number>(8);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await crmService.getEmployees(user?.id);
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const openCreateModal = () => {
    const nextId = `EMP-00${employees.length + 1}`;
    setEmployeeId(nextId);
    setName('');
    setEmail('');
    setTitle('');
    setDepartment('Engineering');
    setPhone('');
    setEmergencyName('');
    setEmergencyPhone('');
    setWorkLocation('Headquarters (San Francisco)');
    setReportingManagerId(user?.id || '');
    setRole('employee');
    setEmpStatus('active');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setSalary(95000);
    setAnnualQuota(18);
    setSickQuota(10);
    setCasualQuota(8);
    setCreateModalOpen(true);
  };

  const openEditModal = (emp: UserProfile) => {
    setSelectedEmployee(emp);
    setEmployeeId(emp.employee_id || `EMP-${emp.id.slice(-3)}`);
    setName(emp.name);
    setEmail(emp.email);
    setTitle(emp.title);
    setDepartment(emp.department);
    setPhone(emp.phone || '');
    setEmergencyName(emp.emergency_contact_name || '');
    setEmergencyPhone(emp.emergency_contact_phone || '');
    setWorkLocation(emp.work_location || 'Headquarters');
    setReportingManagerId(emp.reporting_manager_id || '');
    setRole(emp.role);
    setEmpStatus(emp.status);
    setJoinDate(emp.join_date || new Date().toISOString().split('T')[0]);
    setSalary(emp.salary || 0);
    setAnnualQuota(emp.annual_leave_quota ?? 18);
    setSickQuota(emp.sick_leave_quota ?? 10);
    setCasualQuota(emp.casual_leave_quota ?? 8);
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !title) {
      showToast('Name, Official Email, and Designation are required', 'error');
      return;
    }

    try {
      await crmService.provisionEmployee(user?.id || 'user-founder-001', {
        employee_id: employeeId || `EMP-${Date.now().toString().slice(-3)}`,
        name,
        email,
        title,
        department,
        phone: phone || undefined,
        emergency_contact_name: emergencyName || undefined,
        emergency_contact_phone: emergencyPhone || undefined,
        work_location: workLocation,
        reporting_manager_id: reportingManagerId || null,
        role,
        status: empStatus,
        join_date: joinDate,
        salary: Number(salary),
        annual_leave_quota: Number(annualQuota),
        sick_leave_quota: Number(sickQuota),
        casual_leave_quota: Number(casualQuota),
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
      });

      showToast(`Employee ${name} (${employeeId}) provisioned successfully!`, 'success');
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
      if (isAdmin) {
        await crmService.updateProfile(user?.id || '', selectedEmployee.id, {
          employee_id: employeeId,
          name,
          title,
          department,
          phone,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          work_location: workLocation,
          reporting_manager_id: reportingManagerId || null,
          role,
          status: empStatus,
          join_date: joinDate,
          salary: Number(salary),
          annual_leave_quota: Number(annualQuota),
          sick_leave_quota: Number(sickQuota),
          casual_leave_quota: Number(casualQuota)
        });
      } else {
        // Employee updating permitted fields on own profile
        await crmService.updateProfile(user?.id || '', selectedEmployee.id, {
          phone,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone
        });
      }

      showToast('Profile updated successfully', 'success');
      setEditModalOpen(false);
      setSelectedEmployee(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee profile', 'error');
    }
  };

  const handleDeactivate = async (emp: UserProfile) => {
    if (emp.id === user?.id) {
      showToast('Security Violation: You cannot deactivate your own account', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to deactivate employee record for ${emp.name}? They will lose platform access.`)) {
      return;
    }

    try {
      await crmService.deactivateEmployee(user?.id || '', emp.id);
      showToast(`${emp.name} account has been deactivated`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate account', 'error');
    }
  };

  const departments = ['all', 'Executive', 'Sales', 'Engineering', 'Marketing', 'Operations', 'Customer Success'];

  const filteredEmployees = employees.filter((emp) => {
    if (selectedDept !== 'all' && emp.department.toLowerCase() !== selectedDept.toLowerCase()) {
      return false;
    }
    if (selectedStatus !== 'all' && emp.status !== selectedStatus) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.title.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        (emp.employee_id && emp.employee_id.toLowerCase().includes(q)) ||
        (emp.work_location && emp.work_location.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isAdmin ? 'Employee Management & Profiles' : 'Company Team Directory'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {filteredEmployees.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Complete company roster, reporting lines, employment status, emergency contacts, and compensation details.'
              : 'Official company contacts, department designations, and workplace locations.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all w-fit"
          >
            <Plus size={16} />
            <span>Provision Employee</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Employee ID, Name, Title, Email, or Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
            <option value="deactivated">Deactivated</option>
          </select>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
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
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => {
          const isMe = emp.id === user?.id;
          const canViewSensitive = isAdmin || isMe;

          return (
            <div
              key={emp.id}
              className={`p-5 rounded-2xl bg-slate-900/70 border transition-all shadow-md flex flex-col justify-between hover:shadow-indigo-500/5 ${
                emp.status === 'deactivated'
                  ? 'border-rose-900/50 bg-rose-950/10 opacity-75'
                  : isMe
                  ? 'border-indigo-500/40 bg-indigo-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}
                      alt={emp.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white leading-tight">{emp.name}</h3>
                        {isMe && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-400 font-medium mt-0.5">{emp.title}</p>
                      <span className="text-[10px] text-slate-400">{emp.department}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        emp.role === 'founder_admin'
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : emp.role === 'admin'
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                      }`}
                    >
                      {emp.role === 'founder_admin' ? 'Founder' : emp.role === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-medium">
                      {emp.employee_id || `ID: ${emp.id.slice(-4)}`}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail size={13} className="text-slate-500 shrink-0" />
                    <a href={`mailto:${emp.email}`} className="hover:text-indigo-400 truncate">
                      {emp.email}
                    </a>
                  </div>

                  {emp.phone ? (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone size={13} className="text-slate-500 shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin size={13} className="text-slate-500 shrink-0" />
                    <span className="truncate">{emp.work_location || 'Headquarters'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={13} className="text-slate-500 shrink-0" />
                    <span>Joined {formatDate(emp.join_date)}</span>
                  </div>

                  {emp.reporting_manager && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <UserCheck size={13} className="text-slate-500 shrink-0" />
                      <span>Reports to: <strong className="text-slate-300">{emp.reporting_manager.name}</strong></span>
                    </div>
                  )}

                  {/* Sensitive Contact & Emergency details */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                    {canViewSensitive ? (
                      <div className="space-y-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                            <HeartPulse size={12} className="text-rose-400" />
                            Emergency Contact:
                          </span>
                          <span className="text-slate-200 font-semibold truncate max-w-[150px]">
                            {emp.emergency_contact_name || 'None Listed'}
                          </span>
                        </div>
                        {emp.emergency_contact_phone && (
                          <div className="text-[11px] text-slate-400 pl-4">
                            Phone: <span className="text-slate-300">{emp.emergency_contact_phone}</span>
                          </div>
                        )}
                        {isAdmin && emp.salary !== undefined && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <DollarSign size={12} />
                              Annual Comp:
                            </span>
                            <span className="text-emerald-400 font-bold">{formatCurrency(emp.salary)} / yr</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-950/40 p-2 rounded-xl border border-slate-800/40">
                        <span className="flex items-center gap-1.5">
                          <Lock size={12} className="text-slate-500" />
                          Emergency Contact & Comp:
                        </span>
                        <span className="italic text-[10px] text-slate-600">Restricted to Admins</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    emp.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : emp.status === 'on_leave'
                      ? 'bg-sky-500/15 text-sky-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {emp.status}
                </span>

                <div className="flex items-center gap-1.5">
                  {(isAdmin || isMe) && (
                    <button
                      onClick={() => openEditModal(emp)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
                      title={isAdmin ? "Edit Full Profile" : "Edit My Contact Details"}
                    >
                      <Edit2 size={12} />
                      <span>{isAdmin ? 'Edit' : 'Update Info'}</span>
                    </button>
                  )}

                  {isAdmin && emp.id !== user?.id && emp.status !== 'deactivated' && (
                    <button
                      onClick={() => handleDeactivate(emp)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors"
                      title="Deactivate employee"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Provision New Employee</h3>
                <p className="text-xs text-slate-400">Add an employee profile, role permissions, and company quotas.</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                    placeholder="EMP-001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Alex Chen"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Official Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="alex.chen@vingo.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Designation / Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Staff Backend Engineer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Executive">Executive</option>
                    <option value="Customer Success">Customer Success</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Jane Doe (Spouse)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+1 (555) 999-8888"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Work Location *</label>
                  <input
                    type="text"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="Headquarters (SF), Remote, or Branch"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Reporting Manager</label>
                  <select
                    value={reportingManagerId}
                    onChange={(e) => setReportingManagerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">None / Self</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Role Permission *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Salary ($ USD)</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    min={0}
                    step={1000}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Leave Days Quota</label>
                  <input
                    type="number"
                    value={annualQuota}
                    onChange={(e) => setAnnualQuota(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Create Employee Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isAdmin ? `Edit Employee Profile (${selectedEmployee.name})` : 'Update My Profile Information'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAdmin
                    ? 'Update employee profile, compensation, emergency contacts, or role permissions.'
                    : 'Update your contact number and emergency contact details.'}
                </p>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin ? (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Employee ID</label>
                      <input
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Designation</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Employment Status</label>
                      <select
                        value={empStatus}
                        onChange={(e) => setEmpStatus(e.target.value as EmployeeStatus)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="inactive">Inactive</option>
                        <option value="deactivated">Deactivated</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Work Location</label>
                      <input
                        type="text"
                        value={workLocation}
                        onChange={(e) => setWorkLocation(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Salary ($)</label>
                      <input
                        type="number"
                        value={salary}
                        onChange={(e) => setSalary(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Leave Days Quota</label>
                      <input
                        type="number"
                        value={annualQuota}
                        onChange={(e) => setAnnualQuota(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                ) : null}

                {/* Permitted for Employee or Admin */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Emergency Contact Person</label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Jane Doe (Spouse)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+1 (555) 999-8888"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!isAdmin && (
                <p className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  <Shield size={14} className="text-indigo-400 shrink-0" />
                  <span>Company governance prevents employees from directly modifying designations, salaries, leave quotas, or role permissions. Contact your Founder or HR Administrator for payroll adjustments.</span>
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
