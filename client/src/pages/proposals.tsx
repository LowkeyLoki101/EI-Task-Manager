import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EmergentLogo from '../components/EmergentLogo';
import type { Proposal } from '@shared/schema';

export default function Proposals() {
  const queryClient = useQueryClient();
  
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['/api/proposals'],
    queryFn: async () => {
      const response = await fetch('/api/proposals');
      return response.json();
    },
    refetchInterval: 3000
  });

  const handleApprove = async (proposalId: string) => {
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
    } catch (error) {
      console.error('Failed to approve proposal:', error);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-error/10 text-error';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-2">
                <EmergentLogo size="md" showText={true} />
              </a>
            </div>
            <a 
              href="/" 
              className="text-sm text-primary hover:text-blue-700 font-medium"
              data-testid="link-back-home"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Code Proposals</h1>
          <p className="text-slate-600 mt-2">Review and manage all code change proposals</p>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-600">Loading proposals...</p>
          </div>
        )}

        {!isLoading && proposals.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No proposals yet</h3>
              <p className="text-slate-600">Code proposals will appear here when the AI supervisor suggests improvements.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {proposals.map((proposal: Proposal) => (
            <Card key={proposal.id} data-testid={`proposal-card-${proposal.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-proposal-title-${proposal.id}`}>
                      {proposal.message}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1" data-testid={`text-proposal-meta-${proposal.id}`}>
                      Proposal {proposal.id} • Created {new Date(proposal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span 
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposal.status)}`}
                    data-testid={`text-proposal-status-${proposal.id}`}
                  >
                    {proposal.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {proposal.diffSummary && proposal.diffSummary.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">Changed Files ({proposal.diffSummary.length}):</h4>
                    <div className="space-y-1">
                      {proposal.diffSummary.map((file: string, index: number) => (
                        <div key={index} className="text-sm font-mono bg-slate-100 px-3 py-1 rounded" data-testid={`text-changed-file-${proposal.id}-${index}`}>
                          {file}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {proposal.previewUrl && (
                  <div className="mb-4">
                    <a 
                      href={proposal.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-blue-700 font-medium"
                      data-testid={`link-preview-${proposal.id}`}
                    >
                      View Preview →
                    </a>
                  </div>
                )}

                {proposal.status === 'pending' && (
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => handleApprove(proposal.id)}
                      className="bg-success text-white hover:bg-green-600"
                      data-testid={`button-approve-${proposal.id}`}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(proposal.id)}
                      data-testid={`button-reject-${proposal.id}`}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
