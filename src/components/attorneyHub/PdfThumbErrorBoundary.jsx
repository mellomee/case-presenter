import React from 'react';
import { FileText } from 'lucide-react';

export default class PdfThumbErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={this.props.className}>
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}