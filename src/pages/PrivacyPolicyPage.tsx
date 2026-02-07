import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage = () => {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Privacy Policy – RakshaNet</h2>
        <p className="text-xs text-gray-500 mb-6">Last Updated: {lastUpdated}</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <p>
            RakshaNet respects user privacy and collects only necessary information for safety purposes.
          </p>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Information We Collect</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Name</li>
              <li>Mobile number</li>
              <li>Email address (optional)</li>
              <li>Emergency contacts</li>
              <li>Location data (only during SOS or with user permission)</li>
              <li>Basic device information for app performance</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">How We Use Information</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>To provide emergency alerts and safety support</li>
              <li>To notify emergency contacts</li>
              <li>To improve app reliability and performance</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Location Usage</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Location is accessed only with explicit user consent</li>
              <li>Background location is used strictly for safety and SOS features</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Data Sharing</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>RakshaNet does not sell or misuse user data</li>
              <li>Data is shared only with trusted services required for app functionality</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Data Security</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Reasonable security measures are applied</li>
              <li>No system is 100% secure</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">User Rights</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Users may update or delete their data</li>
              <li>Users may stop using the app at any time</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Children's Privacy</h3>
            <p className="text-gray-600">
              Not intended for users below 13 years of age.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Policy Updates</h3>
            <p className="text-gray-600">
              Policy may be updated periodically.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
            <p className="text-gray-600">
              Email: support@rakshanet.app
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
