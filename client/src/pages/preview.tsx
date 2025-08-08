import { useParams } from 'wouter';
import EmergentLogo from '../components/EmergentLogo';

export default function Preview() {
  const params = useParams();
  const proposalId = params.id || '';

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
              href="/proposals" 
              className="text-sm text-primary hover:text-blue-700 font-medium"
              data-testid="link-back-proposals"
            >
              ← Back to Proposals
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4" data-testid="text-preview-title">
            Preview: {proposalId}
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 font-medium">Preview Mode Active</p>
            </div>
            <p className="text-blue-700 mt-2 text-sm">
              This page is using proposal overlay <code className="bg-blue-100 px-1 rounded">{proposalId}</code>. 
              Components are resolving files from the proposal directory first.
            </p>
          </div>

          <div className="prose max-w-none">
            <h2>Proposal Details</h2>
            <p>
              This is a preview page for proposal <strong>{proposalId}</strong>. In a complete implementation, 
              this would show the actual application running with the proposed changes applied as an overlay.
            </p>
            
            <h3>How Preview Mode Works</h3>
            <ul>
              <li>Files are loaded from <code>proposals/{proposalId}/</code> directory first</li>
              <li>If a file doesn't exist in the proposal, it falls back to the main application files</li>
              <li>This allows safe testing of changes without affecting the live system</li>
              <li>A banner indicates when preview mode is active</li>
            </ul>

            <h3>Safety Features</h3>
            <ul>
              <li>Proposals are sandboxed and cannot affect production data</li>
              <li>All changes are validated before being applied</li>
              <li>Rollback capabilities ensure system stability</li>
              <li>Human approval is required for all code changes</li>
            </ul>
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Implementation Note:</strong> In a production system, this preview would 
              load the actual application components with the proposed changes overlaid, 
              allowing you to interact with and test the modifications before approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
