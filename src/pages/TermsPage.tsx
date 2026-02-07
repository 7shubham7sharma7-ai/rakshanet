import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900">Terms & Conditions</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Terms & Conditions – RakshaNet</h2>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <p>
            RakshaNet is a safety assistance platform and not a replacement for police, ambulance, or government emergency services.
          </p>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">User Responsibilities</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Provide accurate information</li>
              <li>Avoid misuse or false emergency alerts</li>
              <li>Use the app lawfully</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">No Guarantee</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>RakshaNet does not guarantee emergency response</li>
              <li>Service availability depends on network and external factors</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Service Availability</h3>
            <p className="text-gray-600">
              Temporary downtime may occur due to technical or network issues.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Account Suspension</h3>
            <p className="text-gray-600">
              Accounts may be suspended for misuse or illegal activity.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Changes</h3>
            <p className="text-gray-600">
              Terms may be updated without prior notice.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
