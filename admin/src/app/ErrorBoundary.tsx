import { Button, Result } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';

/** A rendering crash in one screen shows a calm fallback instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnostic only: component stack and message, no request data or personal details.
    console.error('Admin screen crashed:', error.message, info.componentStack?.split('\n').slice(0, 4).join(' | '));
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Result status="error" title="This screen hit a problem" subTitle="Nothing was lost or changed. Reload to try again."
        extra={<Button type="primary" onClick={() => location.reload()}>Reload</Button>} />
    );
  }
}
