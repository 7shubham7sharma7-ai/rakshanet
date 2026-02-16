import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MicrophonePermissionPopupProps {
  open: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export const MicrophonePermissionPopup: React.FC<MicrophonePermissionPopupProps> = ({
  open,
  onAllow,
  onDeny,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50"
            onClick={onDeny}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-center text-foreground mb-2">
                Microphone Permission
              </h2>

              {/* Description */}
              <div className="space-y-3 mb-6">
                <p className="text-sm text-muted-foreground text-center">
                  RakshaNet needs microphone access for your safety.
                </p>
                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Audio is <strong>only recorded during an emergency trigger</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Recording is limited to <strong>20 seconds</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Audio is <strong>automatically sent to the emergency chat</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Used <strong>strictly for safety purposes</strong> only.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={onAllow}
                  size="lg"
                  className="w-full h-12 font-semibold"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Allow Microphone
                </Button>

                <Button
                  onClick={onDeny}
                  variant="ghost"
                  size="lg"
                  className="w-full text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Not Now
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
