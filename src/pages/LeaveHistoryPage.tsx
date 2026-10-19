import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { crmService } from '@/services/crmService';
import { LeaveRecord } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';

export const LeaveHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      crmService.getMyLeaves(user.id).then((data: LeaveRecord[]) => {
        setLeaves(data);
        setLoading(false);
      });
    }
  }, [user]);

  const columns: Column<LeaveRecord>[] = [
    {
      key: 'type',
      header: 'Leave Type',
      cell: (row) => (
        <span className="font-semibold capitalize text-foreground">
          {row.leave_type} Leave
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Dates',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.start_date)} — {formatDate(row.end_date)}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (row) => (
        <span className="text-xs font-semibold">{row.days_count} {row.days_count === 1 ? 'day' : 'days'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (row) => (
        <span className="text-xs text-muted-foreground truncate max-w-xs block">
          {row.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const variant =
          row.status === 'approved'
            ? 'success'
            : row.status === 'rejected'
            ? 'destructive'
            : 'warning';
        return <Badge variant={variant} className="capitalize">{row.status}</Badge>;
      },
    },
    {
      key: 'admin_remarks',
      header: 'Admin Remarks',
      cell: (row) => (
        <span className="text-xs text-muted-foreground italic">
          {row.admin_remarks || '—'}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      title="My Leave History"
      description="Track your personal leave submissions, approval status, and administrator remarks."
      actions={
        <Button size="sm" onClick={() => navigate('/leaves/apply')}>
          <Plus className="mr-1.5 h-4 w-4" />
          Apply for Leave
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={leaves}
        isLoading={loading}
        emptyMessage="You have not submitted any leave applications."
        keyExtractor={(row) => row.id}
      />
    </PageContainer>
  );
};

export default LeaveHistoryPage;
