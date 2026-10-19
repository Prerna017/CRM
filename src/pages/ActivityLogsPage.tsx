import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/feedback/EmptyState';
import { History } from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  return (
    <PageContainer
      title="System Activity & Audit Logs"
      description="Immutable security audit trail for user provisioning, role assignments, and authentication events."
    >
      <EmptyState
        icon={History}
        title="Audit Logs Initialized"
        description="All employee logins, role modifications, leave reviews, and lead assignment events are recorded to the database audit ledger."
        className="my-8"
      />
    </PageContainer>
  );
};

export default ActivityLogsPage;
