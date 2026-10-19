import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/feedback/EmptyState';
import { MailCheck } from 'lucide-react';

export const EmailRepliesPage: React.FC = () => {
  return (
    <PageContainer
      title="Inbound Email Replies"
      description="Synced customer conversations, prospect replies, and inbound webhook messages."
    >
      <EmptyState
        icon={MailCheck}
        title="Inbox is Current"
        description="All prospective lead replies and inbound email events processed via the Supabase email webhook will appear in this unified response queue."
        className="my-8"
      />
    </PageContainer>
  );
};

export default EmailRepliesPage;
