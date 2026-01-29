import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Phone, Trash2, Star, User, X } from 'lucide-react';
import { useEmergency, EmergencyContact } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const ContactCard: React.FC<{ 
  contact: EmergencyContact; 
  onDelete: () => void;
}> = ({ contact, onDelete }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
    >
      <Avatar className="h-12 w-12">
        <AvatarFallback className={`${contact.isPrimary ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {contact.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{contact.name}</h3>
          {contact.isPrimary && (
            <Star className="w-4 h-4 text-warning fill-warning shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{contact.phone}</p>
        <p className="text-xs text-muted-foreground">{contact.relationship}</p>
      </div>
      
      <div className="flex gap-2">
        <Button size="icon" variant="ghost" asChild>
          <a href={`tel:${contact.phone}`}>
            <Phone className="w-4 h-4" />
          </a>
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

const ContactsPage: React.FC = () => {
  const { t } = useLanguage();
  const { contacts, addContact, removeContact } = useEmergency();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    
    addContact(formData);
    setFormData({ name: '', phone: '', relationship: '', isPrimary: false });
    setShowAddForm(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground">{t('emergencyContacts')}</h1>
            <p className="text-xs text-muted-foreground">{contacts.length} contacts saved</p>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('addContact')}
          </Button>
        </div>
      </header>

      {/* Contact List */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {contacts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <User className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No contacts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add trusted contacts who will be notified during emergencies
              </p>
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add your first contact
              </Button>
            </motion.div>
          ) : (
            contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onDelete={() => removeContact(contact.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Contact Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowAddForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{t('addContact')}</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    placeholder="e.g., Parent, Spouse, Friend"
                    value={formData.relationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="isPrimary" className="text-sm cursor-pointer">
                    Set as primary contact (will be called first)
                  </Label>
                </div>
                
                <Button type="submit" className="w-full" size="lg">
                  Save Contact
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default ContactsPage;
