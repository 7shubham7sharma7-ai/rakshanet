import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const DisclaimerPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900">Disclaimer</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Disclaimer – RakshaNet</h2>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <p>
            RakshaNet provides an emergency alert and support system only.
          </p>

          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>RakshaNet does not guarantee rescue, response time, or safety</li>
            <li>RakshaNet is not liable for any loss, injury, or delay</li>
            <li>Users use the app at their own risk</li>
            <li>External emergency services are outside RakshaNet's control</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default DisclaimerPage;
