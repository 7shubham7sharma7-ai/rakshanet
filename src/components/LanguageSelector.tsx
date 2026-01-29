import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { LANGUAGES, useLanguage, LanguageCode } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface LanguageSelectorProps {
  variant?: 'full' | 'compact';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'full' }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = LANGUAGES.find(l => l.code === language);

  if (variant === 'compact') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Globe className="w-4 h-4" />
          <span>{currentLanguage?.nativeName}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
        
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors ${
                      language === lang.code ? 'bg-muted' : ''
                    }`}
                  >
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-foreground">{lang.nativeName}</span>
                      <span className="block text-xs text-muted-foreground">{lang.name}</span>
                    </span>
                    {language === lang.code && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">{t('selectLanguage')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as LanguageCode)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              language === lang.code 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <span className="flex-1 text-left">
              <span className="block text-sm font-medium text-foreground">{lang.nativeName}</span>
              <span className="block text-xs text-muted-foreground">{lang.name}</span>
            </span>
            {language === lang.code && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
