import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CalendarClock } from 'lucide-react';

export const FollowupsPage: React.FC = () => {
  return (
    <PageContainer
      title="Scheduled Follow-ups"
      description="Upcoming calls, product demos, reminder nudges, and scheduled deal tasks."
    >
      <EmptyState
        icon={CalendarClock}
        title="No Pending Follow-ups Due"
        description="When follow-up dates are assigned to sales activities or prospect interactions, your prioritized agenda will automatically schedule here."
        className="my-8"
      />
    </PageContainer>
  );
};

export default FollowupsPage;
