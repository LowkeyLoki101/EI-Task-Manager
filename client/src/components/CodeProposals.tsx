import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { Proposal } from '@shared/schema';

interface CodeProposalsProps {
  sessionId: string;
  onPreview: (proposal: Proposal) => void;
}

export default function CodeProposals({ sessionId, onPreview }: CodeProposalsProps) {
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['/api/proposals', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/proposals?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 5000,
    enabled: !!sessionId
  });

  const pendingProposals = proposals.filter((p: Proposal) => p.status === 'pending');

  const handleApprove = async (proposalId: string) => {
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
    } catch (error) {
      console.error('Failed to approve proposal:', error);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning';
      case 'approved': return 'bg-success/20 text-success';
      case 'rejected': return 'bg-error/20 text-error';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Code Proposals</h2>
          <a 
            href="/proposals" 
            className="text-sm text-primary hover:text-blue-700 font-medium"
            data-testid="link-view-all-proposals"
          >
            View All
          </a>
        </div>
      </div>
      
      <div className="p-4 space-y-3" data-testid="proposals-container">
        {isLoading && (
          <div className="text-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading proposals...</p>
          </div>
        )}

        {!isLoading && pendingProposals.length === 0 && (
          <div className="text-center py-6 text-slate-500">
            <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No pending proposals</p>
          </div>
        )}

        {pendingProposals.map((proposal: Proposal) => (
          <div 
            key={proposal.id} 
            className={`border rounded-lg p-3 ${getStatusColor(proposal.status)}`}
            data-testid={`proposal-item-${proposal.id}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-medium text-slate-900" data-testid={`text-proposal-title-${proposal.id}`}>
                  {proposal.message}
                </h3>
                <p className="text-xs text-slate-500" data-testid={`text-proposal-info-${proposal.id}`}>
                  Proposal {proposal.id} • {new Date(proposal.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span 
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(proposal.status)}`}
                data-testid={`text-proposal-status-${proposal.id}`}
              >
                {proposal.status}
              </span>
            </div>
            
            {proposal.diffSummary && proposal.diffSummary.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1">Files changed:</p>
                <div className="space-y-1">
                  {proposal.diffSummary.slice(0, 3).map((file: string, index: number) => (
                    <div key={index} className="text-xs font-mono bg-slate-100 px-2 py-1 rounded" data-testid={`text-changed-file-${proposal.id}-${index}`}>
                      {file}
                    </div>
                  ))}
                  {proposal.diffSummary.length > 3 && (
                    <div className="text-xs text-slate-500">
                      +{proposal.diffSummary.length - 3} more files
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPreview(proposal)}
                className="flex-1 text-xs h-7"
                data-testid={`button-preview-${proposal.id}`}
              >
                Preview
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove(proposal.id)}
                className="text-xs bg-success text-white hover:bg-green-600 h-7"
                data-testid={`button-approve-${proposal.id}`}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleReject(proposal.id)}
                className="text-xs h-7"
                data-testid={`button-reject-${proposal.id}`}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
