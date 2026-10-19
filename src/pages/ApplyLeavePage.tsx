import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/forms/FormField';
import { useAuth } from '@/context/AuthContext';
import { crmService } from '@/services/crmService';
import { LeaveType } from '@/types/database';
import { CalendarPlus, ArrowRight } from 'lucide-react';

export const ApplyLeavePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast } = useAuth();
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysCount, setDaysCount] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!startDate || !endDate || !reason) {
      showToast('Please fill in all required leave fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await crmService.applyLeave({
        user_id: user.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: Number(daysCount),
        reason,
      });
      showToast('Leave application submitted for administrator approval.', 'success');
      navigate('/leaves/history');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply for leave';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Apply for Leave"
      description="Submit a formal leave request for management review and quota adjustment."
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-indigo-400" />
              <span>Leave Application Form</span>
            </CardTitle>
            <CardDescription>
              Annual, sick, and casual leave quotas are verified before formal approval.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <FormField label="Leave Type" required>
                <Select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                >
                  <option value="annual">Annual Leave (Quota: {user?.annual_leave_quota} days)</option>
                  <option value="sick">Sick Leave (Quota: {user?.sick_leave_quota} days)</option>
                  <option value="casual">Casual Leave (Quota: {user?.casual_leave_quota} days)</option>
                  <option value="emergency">Emergency Leave</option>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Start Date" required>
                  <Input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </FormField>

                <FormField label="End Date" required>
                  <Input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Duration (Total Working Days)" required>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  required
                  value={daysCount}
                  onChange={(e) => setDaysCount(parseFloat(e.target.value) || 1)}
                />
              </FormField>

              <FormField label="Reason for Leave" required>
                <Textarea
                  required
                  rows={4}
                  placeholder="Please state the purpose of your leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormField>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/leaves/history')}
              >
                View Leave History
              </Button>
              <Button type="submit" size="sm" isLoading={loading} className="bg-indigo-600 hover:bg-indigo-500">
                <span>Submit Leave Request</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ApplyLeavePage;
