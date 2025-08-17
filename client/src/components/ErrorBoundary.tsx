import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  toolName: string;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] Error in ${this.props.toolName}:`, error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-red-900/20 p-4">
          <div className="text-center">
            <div className="text-red-400 mb-2">❌ Error in {this.props.toolName}</div>
            <div className="text-xs text-gray-400 max-w-md">
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}