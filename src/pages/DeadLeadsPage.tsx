import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ArchiveX, RefreshCw } from 'lucide-react';

export const DeadLeadsPage: React.FC = () => {
  return (
    <PageContainer
      title="Dead & Inactive Leads"
      description="Archived deals, lost opportunities, and disqualified inquiries."
    >
      <EmptyState
        icon={ArchiveX}
        title="No Dead Leads Archived"
        description="Leads marked as 'Lost' or disqualified will be automatically cataloged here for re-engagement campaigns and win-back sequences."
        actionLabel="Refresh Archive"
        onAction={() => window.location.reload()}
        className="my-8"
      />
    </PageContainer>
  );
};

export default DeadLeadsPage;
