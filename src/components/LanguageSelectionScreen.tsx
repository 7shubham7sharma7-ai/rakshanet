import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Check, Shield } from 'lucide-react';
import { LANGUAGES, useLanguage, LanguageCode } from '@/lib/i18n';

interface LanguageSelectionScreenProps {
  onComplete: () => void;
}

export const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ onComplete }) => {
  const { language, setLanguage } = useLanguage();
  const [selected, setSelected] = React.useState<LanguageCode>(language);

  const handleSelect = (code: LanguageCode) => {
    setSelected(code);
    setLanguage(code);
  };

  const handleContinue = () => {
    localStorage.setItem('rakshanet_language_chosen', 'true');
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-6 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-foreground mb-1"
        >
          RakshaNet
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-2 text-muted-foreground"
        >
          <Globe className="w-4 h-4" />
          <p className="text-sm">Choose your language / अपनी भाषा चुनें</p>
        </motion.div>
      </div>

      {/* Language Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {LANGUAGES.map((lang, index) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => handleSelect(lang.code as LanguageCode)}
              className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                selected === lang.code
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground bg-card'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="block text-base font-semibold text-foreground truncate">
                  {lang.nativeName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {lang.name}
                </span>
              </div>
              {selected === lang.code && (
                <Check className="w-5 h-5 text-primary shrink-0" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleContinue}
          className="w-full max-w-md mx-auto block h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-lg hover:opacity-90 transition-opacity"
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
};
