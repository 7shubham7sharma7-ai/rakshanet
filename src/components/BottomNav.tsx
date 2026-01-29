import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Users, Headphones, Settings } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/', icon: Home, labelKey: 'home' },
  { path: '/chat', icon: MessageCircle, labelKey: 'chat' },
  { path: '/contacts', icon: Users, labelKey: 'contacts' },
  { path: '/helpers', icon: Headphones, labelKey: 'helpers' },
  { path: '/settings', icon: Settings, labelKey: 'settings' },
];

export const BottomNav: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card/80 backdrop-blur-lg border-t border-border z-30">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon 
                className={`w-5 h-5 mb-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`} 
              />
              <span 
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {t(item.labelKey)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
