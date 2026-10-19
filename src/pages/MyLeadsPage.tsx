import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { crmService } from '@/services/crmService';
import { Lead } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, User, Clock } from 'lucide-react';

export const MyLeadsPage: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      crmService.getLeads().then((data) => {
        // Filter specifically for leads assigned to this employee
        const myAssigned = data.filter((l) => l.assigned_to === user.id);
        setLeads(myAssigned);
        setLoading(false);
      });
    }
  }, [user]);

  const columns: Column<Lead>[] = [
    {
      key: 'deal',
      header: 'Deal / Company',
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground text-sm block">{row.title}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" />
            {row.company}
          </span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Person',
      cell: (row) => (
        <div>
          <span className="text-xs font-medium text-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            {row.contact_name}
          </span>
          <span className="text-[11px] text-muted-foreground block">{row.contact_email || 'No email'}</span>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Deal Value',
      cell: (row) => (
        <span className="font-bold text-sm text-foreground">
          {formatCurrency(row.value, row.currency)}
        </span>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (row) => {
        const variant =
          row.stage === 'won'
            ? 'success'
            : row.stage === 'lost'
            ? 'destructive'
            : row.stage === 'proposal'
            ? 'purple'
            : 'default';
        return <Badge variant={variant} className="capitalize">{row.stage}</Badge>;
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => {
        const variant =
          row.priority === 'urgent'
            ? 'destructive'
            : row.priority === 'high'
            ? 'warning'
            : 'secondary';
        return <Badge variant={variant} className="capitalize">{row.priority}</Badge>;
      },
    },
    {
      key: 'close_date',
      header: 'Target Close',
      cell: (row) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(row.expected_close_date)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      title="My Assigned Leads"
      description="Active sales opportunities and prospects assigned to your portfolio."
    >
      <DataTable
        columns={columns}
        data={leads}
        isLoading={loading}
        emptyMessage="You have no active sales leads currently assigned to you."
        keyExtractor={(row) => row.id}
      />
    </PageContainer>
  );
};

export default MyLeadsPage;
