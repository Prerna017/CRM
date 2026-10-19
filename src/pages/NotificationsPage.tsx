import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Bell } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  return (
    <PageContainer
      title="System Notifications"
      description="Company-wide broadcasts, leave review alerts, and lead status updates."
    >
      <EmptyState
        icon={Bell}
        title="You're All Caught Up"
        description="There are no unread system notifications or pending action requests in your inbox."
        className="my-8"
      />
    </PageContainer>
  );
};

export default NotificationsPage;
