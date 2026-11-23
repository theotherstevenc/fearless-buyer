import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}
interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application render failed', error, info.componentStack)
  }
  render(): ReactNode {
    if (this.state.hasError)
      return (
        <main className="login-shell">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="error mt-4" role="alert">
            Reload to try again. If this keeps happening, check the app configuration.
          </p>
          <button className="button-primary mt-4" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </main>
      )
    return this.props.children
  }
}
