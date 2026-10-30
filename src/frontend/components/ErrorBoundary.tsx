import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ShipSignal error boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24, color: "#ae2e24" }}>
          <h2>Something went wrong</h2>
          <p>{this.state.message}</p>
          <button onClick={() => this.setState({ hasError: false, message: "" })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}