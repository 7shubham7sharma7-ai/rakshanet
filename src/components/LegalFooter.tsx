import React from 'react';
import { Link } from 'react-router-dom';

export const LegalFooter: React.FC = () => {
  return (
    <div className="py-4 px-4 text-center">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Link to="/privacy-policy" className="hover:underline">
          Privacy Policy
        </Link>
        <span>|</span>
        <Link to="/terms" className="hover:underline">
          Terms & Conditions
        </Link>
        <span>|</span>
        <Link to="/disclaimer" className="hover:underline">
          Disclaimer
        </Link>
      </div>
    </div>
  );
};
