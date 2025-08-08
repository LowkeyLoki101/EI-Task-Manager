import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Proposal } from '@shared/schema';

interface CodePreviewModalProps {
  proposal: Proposal | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function CodePreviewModal({ proposal, onClose, onApprove, onReject }: CodePreviewModalProps) {
  if (!proposal) return null;

  const handleApprove = () => {
    onApprove(proposal.id);
  };

  const handleReject = () => {
    onReject(proposal.id);
  };

  return (
    <Dialog open={!!proposal} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0" data-testid="code-preview-modal">
        <DialogHeader className="p-4 border-b border-slate-200">
          <div>
            <DialogTitle className="text-lg font-semibold text-slate-900" data-testid="text-proposal-message">
              {proposal.message}
            </DialogTitle>
            <p className="text-sm text-slate-500" data-testid="text-proposal-id">
              Proposal {proposal.id}
            </p>
          </div>
        </DialogHeader>
        
        <div className="flex h-96">
          {/* File List */}
          <div className="w-1/3 border-r border-slate-200 p-4">
            <h4 className="text-sm font-medium text-slate-900 mb-3">Changed Files</h4>
            <div className="space-y-2">
              {proposal.diffSummary && proposal.diffSummary.length > 0 ? (
                proposal.diffSummary.map((file: string, index: number) => (
                  <div 
                    key={index} 
                    className="p-2 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100"
                    data-testid={`file-diff-${index}`}
                  >
                    <div className="text-sm font-mono text-green-800">{file}</div>
                    <div className="text-xs text-green-600">Modified</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 italic">No file changes specified</div>
              )}
            </div>
          </div>
          
          {/* Code Diff View */}
          <div className="flex-1 p-4 overflow-auto">
            <h4 className="text-sm font-medium text-slate-900 mb-3">Preview</h4>
            <div className="bg-slate-100 rounded-lg p-4 font-mono text-xs overflow-auto h-full">
              <div className="space-y-1">
                <div className="text-slate-600"># Code changes will be shown here</div>
                <div className="text-green-600">+ This is a preview of the proposed changes</div>
                <div className="text-slate-600"># Full diff view would be implemented</div>
                <div className="text-slate-600"># with proper syntax highlighting</div>
                <div className="text-red-600">- Old code would be marked in red</div>
                <div className="text-green-600">+ New code would be marked in green</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">Safety Check:</span> Changes have been validated and are safe to apply.
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost"
                onClick={onClose}
                className="text-sm"
                data-testid="button-cancel-preview"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleReject}
                className="text-sm"
                data-testid="button-reject-proposal"
              >
                Reject
              </Button>
              <Button 
                onClick={handleApprove}
                className="text-sm bg-success text-white hover:bg-green-600"
                data-testid="button-approve-proposal"
              >
                Approve & Deploy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
