import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Smartphone, 
  CheckCircle, 
  AlertCircle, 
  RotateCw, 
  Settings,
  Clock,
  ExternalLink
} from 'lucide-react';

interface CalendarSyncProps {
  sessionId: string;
}

export default function CalendarSync({ sessionId }: CalendarSyncProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded for better visibility
  const [appleId, setAppleId] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const queryClient = useQueryClient();

  // Get calendar sync status
  const { data: calendarStatus, isLoading } = useQuery({
    queryKey: ['/api/calendar/status', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/status/${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId,
    refetchInterval: 30000 // Check status every 30 seconds
  });

  // Get upcoming events
  const { data: eventsData } = useQuery({
    queryKey: ['/api/calendar/events', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events/${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId && calendarStatus?.connected,
    refetchInterval: 60000 // Check events every minute
  });

  // Connect calendar mutation
  const connectMutation = useMutation({
    mutationFn: async ({ appleId, appPassword }: { appleId: string; appPassword: string }) => {
      const response = await fetch(`/api/calendar/connect/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appleId, appPassword })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/calendar/status', sessionId] });
        setShowSetup(false);
        setAppleId('');
        setAppPassword('');
      }
    }
  });

  // Sync all tasks mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/calendar/sync-all/${sessionId}`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/status', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events', sessionId] });
    }
  });

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (appleId.trim() && appPassword.trim()) {
      connectMutation.mutate({ appleId: appleId.trim(), appPassword: appPassword.trim() });
    }
  };

  if (!isExpanded) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <Smartphone className="h-4 w-4 text-green-600" />
              <span className="text-green-800 dark:text-green-200">iPhone Calendar</span>
              <Badge variant="secondary" className={
                calendarStatus?.connected 
                  ? "bg-green-100 text-green-800" 
                  : "bg-orange-100 text-orange-800"
              }>
                {calendarStatus?.connected ? 'Connected' : 'Setup Required'}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(true)}
              data-testid="expand-calendar"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-green-700 dark:text-green-300">
            {calendarStatus?.connected 
              ? `Sync active. Last sync: ${calendarStatus.lastSync ? new Date(calendarStatus.lastSync).toLocaleString() : 'Never'}`
              : 'Sync your tasks with iPhone calendar for cross-device access and notifications.'
            }
          </p>
          {eventsData?.events && eventsData.events.length > 0 && (
            <div className="mt-2 text-xs text-green-600 dark:text-green-400">
              {eventsData.events.length} upcoming task events in your calendar
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <Smartphone className="h-4 w-4 text-green-600" />
            <span className="text-green-800 dark:text-green-200">iPhone Calendar Sync</span>
            <Badge variant="secondary" className={
              calendarStatus?.connected 
                ? "bg-green-100 text-green-800" 
                : "bg-orange-100 text-orange-800"
            }>
              {calendarStatus?.connected ? 'Connected' : 'Setup Required'}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(false)}
            data-testid="collapse-calendar"
          >
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {calendarStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900 rounded border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800 dark:text-green-200">iPhone Calendar Connected</div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Last sync: {calendarStatus.lastSync ? new Date(calendarStatus.lastSync).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>

            {/* Sync Controls */}
            <div className="flex gap-2">
              <Button 
                onClick={() => syncAllMutation.mutate()}
                disabled={syncAllMutation.isPending}
                data-testid="sync-all-tasks"
                className="flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                {syncAllMutation.isPending ? 'Syncing...' : 'Sync All Tasks'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowSetup(true)}
                data-testid="reconnect-calendar"
              >
                Reconnect
              </Button>
            </div>

            {/* Sync Progress */}
            {syncAllMutation.data && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully synced {syncAllMutation.data.syncedCount} tasks to your iPhone calendar.
                  {syncAllMutation.data.errors.length > 0 && (
                    <div className="mt-2 text-red-600">
                      {syncAllMutation.data.errors.length} errors occurred during sync.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Upcoming Events */}
            {eventsData?.events && eventsData.events.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Upcoming Task Events
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {eventsData.events.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="text-sm p-2 bg-white dark:bg-gray-800 rounded border">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.startDate).toLocaleDateString()} at{' '}
                        {new Date(event.startDate).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Setup Form */
          <div className="space-y-4">
            {connectMutation.data?.setupInstructions && !showSetup && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">iPhone Calendar Setup Required</div>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      {connectMutation.data.setupInstructions.map((instruction: string, idx: number) => (
                        <li key={idx}>{instruction}</li>
                      ))}
                    </ol>
                    <Button 
                      size="sm" 
                      onClick={() => setShowSetup(true)}
                      className="mt-2"
                      data-testid="show-setup-form"
                    >
                      Enter Credentials
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {(showSetup || !connectMutation.data) && (
              <form onSubmit={handleConnect} className="space-y-3">
                <div>
                  <Label htmlFor="apple-id">Apple ID</Label>
                  <Input
                    id="apple-id"
                    type="email"
                    value={appleId}
                    onChange={(e) => setAppleId(e.target.value)}
                    placeholder="your@icloud.com"
                    data-testid="apple-id-input"
                  />
                </div>
                <div>
                  <Label htmlFor="app-password">App-Specific Password</Label>
                  <Input
                    id="app-password"
                    type="password"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    data-testid="app-password-input"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Generate at <button 
                      type="button"
                      onClick={() => window.open('https://appleid.apple.com', '_blank')}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      appleid.apple.com <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={!appleId.trim() || !appPassword.trim() || connectMutation.isPending}
                  className="w-full"
                  data-testid="connect-calendar"
                >
                  {connectMutation.isPending ? 'Connecting...' : 'Connect iPhone Calendar'}
                </Button>
              </form>
            )}

            {connectMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to connect calendar. Please check your Apple ID and app password.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-green-600 dark:text-green-400">
          🍎 Your tasks will appear as calendar events on your iPhone, with reminders and notifications enabled for seamless productivity.
        </div>
      </CardContent>
    </Card>
  );
}