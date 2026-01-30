import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Phone, Trash2, Star, User, X, Loader2, ContactIcon } from 'lucide-react';
import { useEmergency, EmergencyContact } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schemas
const nameSchema = z.string().trim().min(1, "Name is required").max(100, "Name too long");
const phoneSchema = z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Enter valid Indian mobile number");
const relationshipSchema = z.string().max(50, "Relationship too long").optional();

const RELATIONSHIPS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Friend',
  'Relative',
  'Neighbor',
  'Colleague',
  'Other'
];

const ContactCard: React.FC<{ 
  contact: EmergencyContact; 
  onDelete: () => void;
  isDeleting: boolean;
}> = ({ contact, onDelete, isDeleting }) => {
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
          {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
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
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onDelete} 
          className="text-destructive"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
};

const ContactsPage: React.FC = () => {
  const { t } = useLanguage();
  const { contacts, addContact, removeContact } = useEmergency();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      nameSchema.parse(formData.name);
    } catch (e: any) {
      newErrors.name = e.errors?.[0]?.message || 'Invalid name';
    }
    
    // Format phone number for validation
    const phoneForValidation = formData.phone.startsWith('+91') 
      ? formData.phone 
      : `+91${formData.phone.replace(/\D/g, '')}`;
    
    try {
      phoneSchema.parse(phoneForValidation);
    } catch (e: any) {
      newErrors.phone = e.errors?.[0]?.message || 'Invalid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Format phone number
      const formattedPhone = formData.phone.startsWith('+91') 
        ? formData.phone 
        : `+91${formData.phone.replace(/\D/g, '')}`;
      
      await addContact({
        name: formData.name.trim(),
        phone: formattedPhone,
        relationship: formData.relationship || 'Other',
        isPrimary: formData.isPrimary,
      });
      
      toast({ title: 'Contact added', description: `${formData.name.trim()} has been added to your emergency contacts.` });
      setFormData({ name: '', phone: '', relationship: '', isPrimary: false });
      setShowAddForm(false);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to add contact',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeContact(id);
      toast({ title: 'Contact removed' });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to remove contact',
        variant: 'destructive'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits and + sign
    const cleaned = value.replace(/[^\d+]/g, '');
    // Limit to 13 characters (+91 + 10 digits)
    const limited = cleaned.slice(0, 13);
    setFormData(prev => ({ ...prev, phone: limited }));
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
              <ContactIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No emergency contacts</h3>
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
                onDelete={() => handleDelete(contact.id)}
                isDeleting={deletingId === contact.id}
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
              className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{t('addContact')}</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter contact name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={100}
                    required
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      +91
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={formData.phone.replace('+91', '')}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`pl-12 ${errors.phone ? 'border-destructive' : ''}`}
                      required
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select 
                    value={formData.relationship} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((rel) => (
                        <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Save Contact'
                  )}
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
