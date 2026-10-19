import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { crmService } from '@/services/crmService';
import {
  EmailLog,
  EmailReplyCategory,
  EmailIntegrationConfig,
  InboundEmailBuffer,
  Lead,
  EmailProvider
} from '@/types/database';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  Mail,
  MailCheck,
  Send,
  MessageSquare,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Link2,
  Unlink,
  HelpCircle,
  FileText,
  User,
  Building
} from 'lucide-react';

const REPLY_CATEGORIES: EmailReplyCategory[] = [
  'Interested',
  'Not Interested',
  'Follow-up Later',
  'Asked for Pricing',
  'Meeting Requested',
  'Out of Office',
  'No Response',
  'Unsubscribe Request',
  'Other'
];

const PREDEFINED_TEMPLATES = [
  {
    name: 'Custom Email',
    subject: '',
    content: ''
  },
  {
    name: 'Introductory Value Proposition',
    subject: 'Transforming workflow efficiency for {{company}}',
    content: 'Hi {{contact}},\n\nI noticed {{company}} is scaling rapidly. Our enterprise platform helps companies streamline client onboarding, track high-touch deals, and automate sales pipeline execution.\n\nWould you have 15 minutes this Thursday for a brief walkthrough?'
  },
  {
    name: 'Product Demo Invitation',
    subject: 'Interactive Demo for {{company}}',
    content: 'Hi {{contact}},\n\nFollowing our initial conversation, I have prepared an interactive sandbox tailored to {{company}}\'s operational workflow.\n\nLet me know if you would like me to reserve a slot on our product specialist\'s calendar.'
  },
  {
    name: 'Pricing & Enterprise Commercials Breakdown',
    subject: 'Commercial Proposal & Volume Licensing — {{company}}',
    content: 'Hi {{contact}},\n\nAs requested, here is the customized commercial tier breakdown for {{company}}. Our enterprise plan includes dedicated SLA guarantees, custom webhooks, and unlimited user seats.\n\nI have attached our pricing schedule for your review.'
  },
  {
    name: 'Nudge / Follow-up on Proposal',
    subject: 'Quick follow-up on {{company}}\'s initiative',
    content: 'Hi {{contact}},\n\nJust floating this to the top of your inbox. Did you get a chance to review the proposal we shared last week?\n\nHappy to answer any technical or pricing questions at your convenience.'
  }
];

export const EmailRepliesPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();

  // Data states
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [integration, setIntegration] = useState<EmailIntegrationConfig | null>(null);
  const [inboundBuffer, setInboundBuffer] = useState<InboundEmailBuffer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedLeadFilter, setSelectedLeadFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'history' | 'buffer'>('history');

  // Manual Email Logging Modal
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [targetLeadId, setTargetLeadId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sentAt, setSentAt] = useState(new Date().toISOString().slice(0, 16));
  const [replyReceived, setReplyReceived] = useState(false);
  const [replyAt, setReplyAt] = useState('');
  const [replyCategory, setReplyCategory] = useState<EmailReplyCategory>('Interested');
  const [replyContent, setReplyContent] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(PREDEFINED_TEMPLATES[0].name);

  // Quick Reply Modal (for existing sent email)
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [activeLogForReply, setActiveLogForReply] = useState<EmailLog | null>(null);
  const [quickReplyCategory, setQuickReplyCategory] = useState<EmailReplyCategory>('Interested');
  const [quickReplyContent, setQuickReplyContent] = useState('');
  const [quickReplyDate, setQuickReplyDate] = useState(new Date().toISOString().slice(0, 16));
  const [quickNextFollowUp, setQuickNextFollowUp] = useState('');
  const [quickReplyNotes, setQuickReplyNotes] = useState('');

  // OAuth Integration Modal
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<EmailProvider>('gmail');
  const [oauthEmail, setOauthEmail] = useState('sales-team@megacorp.com');

  // Manual Inbound Association
  const [manualAssocLeadId, setManualAssocLeadId] = useState<{ [bufId: string]: string }>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedLeads, fetchedLogs, fetchedIntegration, fetchedBuffer] = await Promise.all([
        crmService.getLeads(user?.id),
        crmService.getEmailLogs(undefined, user?.id),
        user ? crmService.getEmailIntegration(user.id) : null,
        crmService.getInboundEmailBuffer(user?.id)
      ]);

      setLeads(fetchedLeads);
      setEmailLogs(fetchedLogs);
      setIntegration(fetchedIntegration);
      setInboundBuffer(fetchedBuffer);
    } catch (err: any) {
      showToast(err.message || 'Failed to load email activity.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle lead change in Log Modal to auto-fill recipient
  const handleLeadSelect = (leadId: string) => {
    setTargetLeadId(leadId);
    const chosen = leads.find((l) => l.id === leadId);
    if (chosen) {
      setRecipientEmail(chosen.contact_email || '');
      const compName = chosen.company_name || chosen.company || '';
      const contName = chosen.contact_name || '';
      if (selectedTemplate !== 'Custom Email') {
        const tmpl = PREDEFINED_TEMPLATES.find((t) => t.name === selectedTemplate);
        if (tmpl) {
          setSubject(tmpl.subject.replace(/{{company}}/g, compName).replace(/{{contact}}/g, contName));
          setMessageContent(
            tmpl.content
              .replace(/{{company}}/g, compName)
              .replace(/{{contact}}/g, contName)
          );
        }
      }
    }
  };

  // Handle template selection
  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    const tmpl = PREDEFINED_TEMPLATES.find((t) => t.name === templateName);
    const chosen = leads.find((l) => l.id === targetLeadId);
    if (tmpl) {
      if (chosen) {
        const compName = chosen.company_name || chosen.company || '';
        const contName = chosen.contact_name || '';
        setSubject(tmpl.subject.replace(/{{company}}/g, compName).replace(/{{contact}}/g, contName));
        setMessageContent(
          tmpl.content
            .replace(/{{company}}/g, compName)
            .replace(/{{contact}}/g, contName)
        );
      } else {
        setSubject(tmpl.subject.replace(/{{company}}/g, '[Company]').replace(/{{contact}}/g, '[Contact]'));
        setMessageContent(tmpl.content.replace(/{{company}}/g, '[Company]').replace(/{{contact}}/g, '[Contact]'));
      }
    }
  };

  // Submit Manual Email Log
  const handleSubmitManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLeadId) {
      showToast('Please select a valid Lead.', 'error');
      return;
    }
    if (!recipientEmail || !subject || !messageContent) {
      showToast('Recipient email, subject, and message content are required.', 'error');
      return;
    }

    try {
      await crmService.createEmailLog(
        {
          lead_id: targetLeadId,
          recipient_email: recipientEmail,
          subject,
          message_content: messageContent,
          sent_at: new Date(sentAt).toISOString(),
          reply_received: replyReceived,
          reply_at: replyReceived && replyAt ? new Date(replyAt).toISOString() : null,
          reply_category: replyReceived ? replyCategory : null,
          next_follow_up_date: nextFollowUpDate || null,
          notes: notes || null
        },
        user?.id
      );

      showToast('Email record logged successfully.', 'success');
      setLogModalOpen(false);
      resetLogModal();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to log email record.', 'error');
    }
  };

  const resetLogModal = () => {
    setTargetLeadId('');
    setRecipientEmail('');
    setSubject('');
    setMessageContent('');
    setSentAt(new Date().toISOString().slice(0, 16));
    setReplyReceived(false);
    setReplyAt('');
    setReplyCategory('Interested');
    setReplyContent('');
    setNextFollowUpDate('');
    setNotes('');
    setSelectedTemplate(PREDEFINED_TEMPLATES[0].name);
  };

  // Quick Reply Submission
  const handleRecordQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLogForReply) return;

    try {
      await crmService.recordEmailReply(
        activeLogForReply.id,
        {
          reply_category: quickReplyCategory,
          reply_content: quickReplyContent,
          reply_at: new Date(quickReplyDate).toISOString(),
          next_follow_up_date: quickNextFollowUp || null,
          notes: quickReplyNotes
        },
        user?.id
      );

      showToast(`Reply recorded as "${quickReplyCategory}".`, 'success');
      setReplyModalOpen(false);
      setActiveLogForReply(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record email reply.', 'error');
    }
  };

  // Connect OAuth
  const handleConnectOAuth = async () => {
    if (!user) return;
    try {
      const scopes =
        oauthProvider === 'gmail'
          ? ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']
          : ['Mail.Read', 'Mail.Send', 'User.Read'];

      await crmService.connectEmailIntegration(user.id, oauthProvider, oauthEmail, scopes);
      showToast(`Connected company ${oauthProvider === 'gmail' ? 'Gmail API' : 'Microsoft Graph'} account.`, 'success');
      setOauthModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Connection failed.', 'error');
    }
  };

  // Simulate Error
  const handleSimulateError = async () => {
    if (!user) return;
    try {
      await crmService.simulateIntegrationError(
        user.id,
        'OAuth Refresh Token expired (401 Unauthorized): Upstream provider revoked consent.'
      );
      showToast('Simulated integration error state.', 'error');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Reconnect / Recover
  const handleReconnect = async () => {
    if (!user) return;
    try {
      await crmService.reconnectEmailIntegration(user.id);
      showToast('Email integration successfully restored and tokens renewed.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!user) return;
    if (!confirm('Disconnect company email integration? Manual logging will remain available.')) return;
    try {
      await crmService.disconnectEmailIntegration(user.id);
      showToast('Email integration disconnected.', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Match Inbound Buffer manually
  const handleManualBufferMatch = async (bufferId: string) => {
    const chosenLeadId = manualAssocLeadId[bufferId];
    if (!chosenLeadId) {
      showToast('Please select a lead to associate with this message.', 'error');
      return;
    }

    try {
      await crmService.matchInboundEmail(bufferId, chosenLeadId, user?.id);
      showToast('Inbound email successfully matched and attached to lead conversation history.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Manual association failed.', 'error');
    }
  };

  // Filtered Logs
  const filteredLogs = emailLogs.filter((log) => {
    if (selectedLeadFilter !== 'all' && log.lead_id !== selectedLeadFilter) return false;
    if (selectedCategoryFilter !== 'all') {
      if (selectedCategoryFilter === 'no_reply') {
        if (log.reply_received) return false;
      } else if (log.reply_category !== selectedCategoryFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = log.subject.toLowerCase().includes(q);
      const matchRecipient = log.recipient_email.toLowerCase().includes(q);
      const matchContent = log.message_content.toLowerCase().includes(q);
      const company = log.lead?.company_name || log.lead?.company || '';
      const matchCompany = company.toLowerCase().includes(q);
      if (!matchSubject && !matchRecipient && !matchContent && !matchCompany) return false;
    }
    return true;
  });

  const getCategoryBadgeColor = (cat?: EmailReplyCategory | null) => {
    switch (cat) {
      case 'Interested':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Asked for Pricing':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Meeting Requested':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Follow-up Later':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Not Interested':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Out of Office':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'No Response':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Unsubscribe Request':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Mail className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Email Replies &amp; Communications</h1>
          </div>
          <p className="text-sm text-slate-400">
            Log sales communications, track inbound responses, classify buyer intent, and monitor synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setOauthModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
          >
            <Shield className="h-4 w-4 text-indigo-400" />
            <span>Email Integration</span>
          </button>
          <button
            onClick={() => {
              resetLogModal();
              setLogModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Log Email Communication</span>
          </button>
        </div>
      </div>

      {/* Integration Status Bar */}
      {integration?.status === 'connected' ? (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {integration.provider === 'gmail' ? 'Google Gmail API' : 'Microsoft Graph'} Connected
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  Sync Active
                </span>
                <span className="text-slate-400 text-[11px]">({integration.connected_email})</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Least-privilege OAuth scopes active: {integration.scopes.join(', ')} • Webhook ingestion active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateError}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all text-[11px] font-medium"
              title="Test error state recovery"
            >
              Simulate Error
            </button>
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-[11px] font-medium"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : integration?.status === 'error' ? (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 animate-pulse">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-200">Email Synchronization Interrupted</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                  Action Required
                </span>
              </div>
              <p className="text-rose-300/80 text-[11px] mt-0.5">
                {integration.error_message || 'Upstream provider connection error. Sync is paused.'}
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Manual email logging is completely unaffected and operational.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all text-[11px] shadow-sm shadow-rose-600/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reconnect / Recover</span>
            </button>
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-[11px] font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-slate-800 text-slate-400">
              <Unlink className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Email Integration Not Configured</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold border border-slate-700">
                  Sync Unavailable
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Manual email logging is fully operational. Connect an authorized corporate Gmail API or Microsoft Graph account to ingest inbound replies automatically.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOauthModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all text-[11px] font-semibold"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Connect Account (OAuth)</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Conversation History ({emailLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('buffer')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'buffer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Inbound Webhook Queue ({inboundBuffer.length})</span>
            {inboundBuffer.some((b) => b.is_ambiguous && !b.is_processed) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Showing {activeTab === 'history' ? filteredLogs.length : inboundBuffer.length} records
        </div>
      </div>

      {activeTab === 'history' && (
        <>
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search subject, body, or recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <select
                value={selectedLeadFilter}
                onChange={(e) => setSelectedLeadFilter(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Filter by Lead: All Leads</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.company_name} — {l.contact_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Reply Categories</option>
                <option value="no_reply">Awaiting Reply (No Response Yet)</option>
                {REPLY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversation Thread Feed */}
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-xs">Loading email communication history...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
              <MailCheck className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No email communications logged yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Record your outreach notes, sales messages, and buyer replies to maintain complete chronological visibility.
              </p>
              <button
                onClick={() => setLogModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Log First Communication
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const leadName = log.lead?.company_name || 'Associated Lead';
                const contactName = log.lead?.contact_name || log.recipient_email;

                return (
                  <div
                    key={log.id}
                    className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all shadow-sm"
                  >
                    {/* Log Header */}
                    <div className="p-4 bg-slate-900/80 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Send className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{log.subject}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700">
                              {leadName}
                            </span>
                            {log.reply_category && (
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${getCategoryBadgeColor(
                                  log.reply_category
                                )}`}
                              >
                                {log.reply_category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                              To: {contactName} ({log.recipient_email})
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              Sent: {formatDateTime(log.sent_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-auto">
                        {!log.reply_received && (
                          <button
                            onClick={() => {
                              setActiveLogForReply(log);
                              setReplyModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Record Reply</span>
                          </button>
                        )}
                        {log.next_follow_up_date && (
                          <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            <Calendar className="h-3 w-3" />
                            Follow-up: {formatDate(log.next_follow_up_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sent Content */}
                    <div className="p-4 text-xs text-slate-300 leading-relaxed bg-slate-950/40">
                      <div className="font-semibold text-slate-400 mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <FileText className="h-3 w-3" />
                        Message Sent
                      </div>
                      <div className="whitespace-pre-wrap font-sans text-slate-200">{log.message_content}</div>
                      {log.notes && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                          <strong className="text-slate-300">Staff Notes:</strong> {log.notes}
                        </div>
                      )}
                    </div>

                    {/* Reply Section (If reply was received) */}
                    {log.reply_received && (
                      <div className="p-4 bg-indigo-950/20 border-t border-indigo-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs font-bold text-indigo-200">
                              Inbound Reply Received — Category: {log.reply_category || 'Interested'}
                            </span>
                          </div>
                          {log.reply_at && (
                            <span className="text-[11px] text-slate-400">
                              Received {formatDateTime(log.reply_at)}
                            </span>
                          )}
                        </div>
                        {log.reply_content && (
                          <div className="text-xs text-slate-300 whitespace-pre-wrap pl-7 border-l-2 border-indigo-500/40 py-1">
                            {log.reply_content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Inbound Buffer Tab */}
      {activeTab === 'buffer' && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400">
            <p>
              Inbound webhook events from Gmail API or Microsoft Graph arrive here. The server matches incoming threads
              automatically by <code>thread_id</code> and email address. When matching is uncertain, employees can
              manually associate the message with the appropriate lead.
            </p>
          </div>

          {inboundBuffer.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No pending inbound webhook buffer items.</div>
          ) : (
            <div className="space-y-3">
              {inboundBuffer.map((buf) => {
                const matchedLead = leads.find((l) => l.id === buf.matched_lead_id);

                return (
                  <div
                    key={buf.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      buf.is_ambiguous && !buf.is_processed
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : buf.is_processed
                        ? 'bg-slate-900/40 border-slate-800 opacity-80'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{buf.subject}</span>
                          {buf.is_processed ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                              Processed &amp; Attached
                            </span>
                          ) : buf.is_ambiguous ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                              Ambiguous Match — Association Required
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
                              Auto-Matched
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>
                            From: <strong className="text-slate-300">{buf.sender_name || buf.sender_email}</strong> ({buf.sender_email})
                          </span>
                          <span>•</span>
                          <span>Received: {formatDateTime(buf.received_at)}</span>
                        </div>
                      </div>

                      {/* Manual Association Controls */}
                      {!buf.is_processed && (
                        <div className="flex items-center gap-2">
                          <select
                            value={manualAssocLeadId[buf.id] || ''}
                            onChange={(e) =>
                              setManualAssocLeadId((prev) => ({ ...prev, [buf.id]: e.target.value }))
                            }
                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Select Target Lead...</option>
                            {leads.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.company_name} ({l.contact_name})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleManualBufferMatch(buf.id)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                          >
                            Associate with Lead
                          </button>
                        </div>
                      )}

                      {buf.is_processed && matchedLead && (
                        <span className="text-xs text-slate-400">
                          Associated to: <strong className="text-slate-200">{matchedLead.company_name}</strong>
                        </span>
                      )}
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-slate-950/60 text-xs text-slate-300 font-mono">
                      {buf.body}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual Email Log Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Manual Email Record Logging</h2>
                  <p className="text-xs text-slate-400">
                    Record outgoing sales messages, responses, and customer feedback.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLogModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManualLog} className="space-y-4 text-xs">
              {/* Select Lead */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Lead ID &amp; Target Company <span className="text-rose-400">*</span>
                </label>
                <select
                  value={targetLeadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Choose a Lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} — {l.contact_name} ({l.contact_email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Email & Sent At */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Recipient Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="prospect@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Sent Timestamp <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={sentAt}
                    onChange={(e) => setSentAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Template Quick Loader */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Message Template / Approved Record
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {PREDEFINED_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.name} value={tmpl.name}>
                      {tmpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Subject <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Scaling enterprise efficiency for Acme Corp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Message Content <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Paste or write the communication text..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Reply Received Toggle */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replyReceived}
                    onChange={(e) => setReplyReceived(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-200 font-semibold">Reply has already been received for this email</span>
                </label>

                {replyReceived && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          Reply Category <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={replyCategory}
                          onChange={(e) => setReplyCategory(e.target.value as EmailReplyCategory)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {REPLY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Reply Timestamp</label>
                        <input
                          type="datetime-local"
                          value={replyAt}
                          onChange={(e) => setReplyAt(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Reply Content Snippet</label>
                      <textarea
                        rows={2}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Customer response excerpt..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Next Follow-up Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Next Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Notes / Internal Context</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Prospect inquired about SLA tier 2 pricing"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Log Communication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Reply Modal */}
      {replyModalOpen && activeLogForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Record Inbound Reply</h2>
                  <p className="text-xs text-slate-400">
                    For subject: <strong className="text-slate-300">{activeLogForReply.subject}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplyModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordQuickReply} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reply Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={quickReplyCategory}
                  onChange={(e) => setQuickReplyCategory(e.target.value as EmailReplyCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                >
                  {REPLY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reply Content Snippet</label>
                <textarea
                  rows={3}
                  value={quickReplyContent}
                  onChange={(e) => setQuickReplyContent(e.target.value)}
                  placeholder="Paste snippet or summary of response..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reply Timestamp</label>
                  <input
                    type="datetime-local"
                    value={quickReplyDate}
                    onChange={(e) => setQuickReplyDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={quickNextFollowUp}
                    onChange={(e) => setQuickNextFollowUp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={quickReplyNotes}
                  onChange={(e) => setQuickReplyNotes(e.target.value)}
                  placeholder="Internal notes regarding buyer sentiment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Save Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OAuth Integration Modal */}
      {oauthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Company Email Integration</h2>
                  <p className="text-xs text-slate-400">OAuth 2.0 with Least-Privilege Scopes</p>
                </div>
              </div>
              <button
                onClick={() => setOauthModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 leading-relaxed space-y-1.5">
                <p className="font-semibold text-slate-300">Security &amp; Consent Principle:</p>
                <p>
                  CRM accounts connect strictly through official corporate OAuth providers. Employees&apos; personal or unshared
                  inboxes are never inspected without explicit authorization.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOauthProvider('gmail')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      oauthProvider === 'gmail'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">Google Gmail API</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Workspace enterprise mail</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOauthProvider('microsoft_graph')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      oauthProvider === 'microsoft_graph'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">Microsoft Graph</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Office 365 / Azure AD</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Authorized Company Mailbox</label>
                <input
                  type="email"
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  placeholder="sales-inbound@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/20 text-[11px] text-indigo-300">
                <strong>Granted Scopes:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                  {oauthProvider === 'gmail' ? (
                    <>
                      <li><code>https://www.googleapis.com/auth/gmail.readonly</code></li>
                      <li><code>https://www.googleapis.com/auth/gmail.send</code></li>
                    </>
                  ) : (
                    <>
                      <li><code>Mail.Read</code></li>
                      <li><code>Mail.Send</code></li>
                      <li><code>User.Read</code></li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOauthModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConnectOAuth}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Authorize &amp; Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailRepliesPage;
