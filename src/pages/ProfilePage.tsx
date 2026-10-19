import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/forms/FormField';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { crmService } from '@/services/crmService';
import { User, Phone, Mail, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser, showToast } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSaved(false);
    try {
      await crmService.updateProfile(user.id, user.id, {
        phone,
        avatar_url: avatarUrl,
      });
      await refreshUser();
      setSaved(true);
      showToast('Profile information updated successfully.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="My Employee Profile"
      description="View your company record, assigned department, leave quota balances, and update contact details."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 text-center p-6 flex flex-col items-center">
          <Avatar
            src={user?.avatar_url}
            alt={user?.name}
            fallback={user?.name || 'U'}
            size="xl"
            className="mb-4"
          />
          <h2 className="text-xl font-bold font-heading text-slate-100">{user?.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{user?.title}</p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="purple">{user?.department}</Badge>
            <Badge variant={user?.role === 'founder_admin' ? 'success' : 'default'}>
              {user?.role === 'founder_admin' ? '👑 Founder' : user?.role?.toUpperCase()}
            </Badge>
          </div>

          <div className="w-full border-t border-border/50 my-6 pt-6 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</span>
              <span className="text-foreground font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</span>
              <span className="text-foreground font-medium">{user?.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined</span>
              <span className="text-foreground font-medium">{user?.join_date}</span>
            </div>
          </div>
        </Card>

        {/* Quotas & Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Leave Quota Balances */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 bg-indigo-500/5 border-indigo-500/20 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Annual Leave</span>
              <p className="text-2xl font-bold text-slate-100 mt-1">{user?.annual_leave_quota || 0}</p>
              <span className="text-[10px] text-muted-foreground">Days per year</span>
            </Card>

            <Card className="p-4 bg-emerald-500/5 border-emerald-500/20 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Sick Leave</span>
              <p className="text-2xl font-bold text-slate-100 mt-1">{user?.sick_leave_quota || 0}</p>
              <span className="text-[10px] text-muted-foreground">Days allocated</span>
            </Card>

            <Card className="p-4 bg-amber-500/5 border-amber-500/20 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Casual Leave</span>
              <p className="text-2xl font-bold text-slate-100 mt-1">{user?.casual_leave_quota || 0}</p>
              <span className="text-[10px] text-muted-foreground">Days allocated</span>
            </Card>
          </div>

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-400" />
                <span>Contact Information</span>
              </CardTitle>
              <CardDescription>
                Update your phone number and profile picture. Role and salary assignments are strictly governed by administrators.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdate}>
              <CardContent className="space-y-4">
                <FormField label="Phone Number">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </FormField>

                <FormField label="Avatar Image URL">
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </FormField>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>Your role (<strong className="text-slate-200">{user?.role}</strong>) and leave quotas are protected and can only be altered by an authorized administrator.</span>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                {saved && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <div className="ml-auto">
                  <Button type="submit" isLoading={loading} size="sm">
                    Save Changes
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProfilePage;
