import React from 'react';
class RentalUnitedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {}
  render() {
    if (this.state.hasError) {
      return <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h5 className="text-red-800 font-semibold mb-2">Error Loading Rental United</h5>
          <p className="text-red-700">
            There was an error loading the Rental United interface. Please try refreshing the page.
          </p>
          <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>;
    }
    return this.props.children;
  }
}
export default RentalUnitedErrorBoundary;
