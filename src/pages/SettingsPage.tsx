import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getFounderEmail } from '@/lib/authConfig';
import { Settings, ShieldCheck, Database, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, isSupabaseConfigured } = useAuth();
  const founderEmail = getFounderEmail();

  return (
    <PageContainer
      title="Platform & Security Settings"
      description="Configure organization details, verified founder credentials, and Supabase integration parameters."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                <span>Organization Identity</span>
              </CardTitle>
              <Badge variant="purple">Vingo Inc.</Badge>
            </div>
            <CardDescription>
              Basic company registration details displayed in all notices and policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Company Name">
              <Input defaultValue="Vingo Technologies Inc." readOnly />
            </FormField>
            <FormField label="Headquarters Timezone">
              <Input defaultValue="UTC - 05:00 (Eastern Time)" readOnly />
            </FormField>
            <FormField label="Standard Workday Length">
              <Input defaultValue="8.0 Hours / Day" readOnly />
            </FormField>
          </CardContent>
        </Card>

        {/* Founder & Security Governance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Founder & Role Governance</span>
              </CardTitle>
              <Badge variant="success">Secured</Badge>
            </div>
            <CardDescription>
              Primary administrator identity established during initial deployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Configured Founder Email (ENV: VITE_FOUNDER_EMAIL)">
              <div className="flex items-center gap-2">
                <Input value={founderEmail} readOnly className="font-mono text-xs" />
              </div>
            </FormField>

            <FormField label="Your Verified Session Role">
              <div className="flex items-center gap-2">
                <Input value={user?.role?.toUpperCase() || 'UNKNOWN'} readOnly className="font-mono text-xs text-indigo-300 font-bold" />
              </div>
            </FormField>

            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
              Only verified Founder/Admin roles can provision team members, assign permission roles, or deactivate employees.
            </div>
          </CardContent>
        </Card>

        {/* Database & Cloud Connection Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-sky-400" />
                <span>Supabase PostgreSQL Integration</span>
              </CardTitle>
              <Badge variant={isSupabaseConfigured ? 'success' : 'warning'}>
                {isSupabaseConfigured ? 'Connected' : 'Interactive Demo Mode'}
              </Badge>
            </div>
            <CardDescription>
              Real-time synchronization status with PostgreSQL database and Edge Functions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {isSupabaseConfigured
                ? 'Your cloud Supabase PostgreSQL instance is actively bound. All employee profiles, clock-ins, leave approvals, and lead modifications persist directly to remote database tables with Row Level Security (RLS) active.'
                : 'Currently running in resilient in-browser mode with pre-seeded company profiles (11–50 employees). To connect your remote database instance, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'}
            </p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <Key className="mr-2 h-3.5 w-3.5" />
                Check Database Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
