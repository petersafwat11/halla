"use client";

import React from "react";
import styles from "./ErrorBoundary.module.css";

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.icon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className={styles.title}>Something went wrong</h3>
          <p className={styles.message}>
            {this.props.fallbackMessage ||
              "An error occurred while loading this section. Please try again."}
          </p>
          {this.state.error && (
            <details className={styles.details}>
              <summary>Error details</summary>
              <pre className={styles.errorText}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <button className={styles.retryButton} onClick={this.handleRetry}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
