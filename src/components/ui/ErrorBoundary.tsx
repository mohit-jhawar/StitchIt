import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: React.ReactNode;
  /**
   * 'inline' — compact error card, suitable for widgets/sections within a page.
   * 'page'   — full centered block, suitable for wrapping an entire page's content.
   */
  variant?: 'inline' | 'page';
  /** Optional label shown in the error UI to help identify which component failed. */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary]${this.props.label ? ` (${this.props.label})` : ''} caught:`,
      error,
      info.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { variant = 'inline', label } = this.props;

    if (variant === 'page') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <FiAlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {label ? `${label} failed to load` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md">
            An unexpected error occurred. Try refreshing, or contact support if the problem persists.
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }

    // inline variant
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
        <FiAlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-800">
            {label ? `${label} failed to load` : 'Component error'}
          </p>
          <p className="text-red-600 text-xs mt-0.5 truncate">{this.state.message}</p>
        </div>
        <button
          onClick={this.handleReset}
          className="shrink-0 text-xs text-red-700 underline hover:text-red-900"
        >
          Retry
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;

/**
 * Wraps any component in an ErrorBoundary.
 * Usage: export default withErrorBoundary(MyComponent, 'My Component');
 */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  label: string,
  variant: 'inline' | 'page' = 'inline'
) {
  function WrappedComponent(props: T) {
    return (
      <ErrorBoundary label={label} variant={variant}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  WrappedComponent.displayName = `withErrorBoundary(${label})`;
  return WrappedComponent;
}
