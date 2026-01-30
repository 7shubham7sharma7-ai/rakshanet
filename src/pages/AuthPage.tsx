import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, User, ArrowLeft, Loader2, Phone, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Invalid email address" }).max(255);
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" }).max(128);
const nameSchema = z.string().trim().min(1, { message: "Name is required" }).max(100);
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, { message: "Enter valid 10-digit Indian mobile number" });

type AuthMode = 'login' | 'signup' | 'reset' | 'phone-otp' | 'phone-name';

const AuthPage: React.FC = () => {
  const { t } = useLanguage();
  const { signIn, signUp, resetPassword, sendPhoneOTP, verifyPhoneOTP } = useAuth();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    otp: '',
  });
  const [isNewPhoneUser, setIsNewPhoneUser] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const validateForm = () => {
    try {
      if (authMethod === 'email') {
        if (mode === 'login' || mode === 'reset') {
          emailSchema.parse(formData.email);
          if (mode === 'login') passwordSchema.parse(formData.password);
        } else if (mode === 'signup') {
          nameSchema.parse(formData.name);
          emailSchema.parse(formData.email);
          passwordSchema.parse(formData.password);
          if (formData.password !== formData.confirmPassword) {
            throw new Error('Passwords do not match');
          }
        }
      } else {
        if (mode === 'login') {
          phoneSchema.parse(formData.phone);
        } else if (mode === 'phone-otp') {
          if (formData.otp.length !== 6) {
            throw new Error('Please enter 6-digit OTP');
          }
        } else if (mode === 'phone-name') {
          nameSchema.parse(formData.name);
        }
      }
      return true;
    } catch (error: any) {
      toast({ 
        title: 'Validation Error', 
        description: error.message || 'Please check your input',
        variant: 'destructive'
      });
      return false;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(formData.email.trim(), formData.password);
        toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
      } else if (mode === 'signup') {
        await signUp(formData.email.trim(), formData.password, formData.name.trim());
        toast({ title: 'Account created!', description: 'Welcome to RakshaSetu.' });
      } else if (mode === 'reset') {
        await resetPassword(formData.email.trim());
        toast({ title: 'Email sent!', description: 'Check your inbox for password reset link.' });
        setMode('login');
      }
    } catch (error: any) {
      let message = 'Something went wrong';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password';
      else if (error.code === 'auth/email-already-in-use') message = 'Email already registered';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email format';
      else if (error.message) message = error.message;
      
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (mode === 'login') {
        await sendPhoneOTP(formData.phone, 'recaptcha-container');
        setMode('phone-otp');
        toast({ title: 'OTP Sent!', description: 'Check your phone for the verification code.' });
      } else if (mode === 'phone-otp') {
        try {
          await verifyPhoneOTP(formData.otp, formData.name || undefined);
          toast({ title: 'Success!', description: 'Phone verified successfully.' });
        } catch (error: any) {
          // Check if it's a new user who needs to set their name
          if (error.message?.includes('new user')) {
            setIsNewPhoneUser(true);
            setMode('phone-name');
            return;
          }
          throw error;
        }
      } else if (mode === 'phone-name') {
        await verifyPhoneOTP(formData.otp, formData.name.trim());
        toast({ title: 'Welcome!', description: 'Account created successfully.' });
      }
    } catch (error: any) {
      let message = 'Something went wrong';
      if (error.code === 'auth/invalid-verification-code') message = 'Invalid OTP. Please try again.';
      else if (error.code === 'auth/code-expired') message = 'OTP expired. Please request a new one.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
      else if (error.message) message = error.message;
      
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', otp: '' });
    setMode('login');
    setIsNewPhoneUser(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        {(mode !== 'login' || authMethod !== 'email') && (
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('appName')}</h1>
          <p className="text-muted-foreground">{t('tagline')}</p>
        </motion.div>

        {/* Auth Method Tabs */}
        {mode === 'login' && (
          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'email' | 'phone')} className="w-full max-w-sm mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* reCAPTCHA container */}
        <div id="recaptcha-container" ref={recaptchaRef}></div>

        {/* Forms */}
        <AnimatePresence mode="wait">
          {authMethod === 'email' ? (
            <motion.form
              key={`email-${mode}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailSubmit}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-6">
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Reset Password'}
              </h2>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    maxLength={255}
                    required
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-10"
                      maxLength={128}
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10"
                      maxLength={128}
                      required
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'reset' && 'Send Reset Link'}
                  </>
                )}
              </Button>

              {mode === 'login' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode('reset')}
                  >
                    Forgot password?
                  </Button>
                  
                  <div className="text-center pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-primary font-medium hover:underline"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </>
              )}

              {mode === 'signup' && (
                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary font-medium hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}
            </motion.form>
          ) : (
            <motion.form
              key={`phone-${mode}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePhoneSubmit}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-6">
                {mode === 'login' && 'Sign In with Phone'}
                {mode === 'phone-otp' && 'Enter OTP'}
                {mode === 'phone-name' && 'Complete Profile'}
              </h2>

              {mode === 'login' && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      +91
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      className="pl-12"
                      maxLength={10}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you a verification code
                  </p>
                </div>
              )}

              {mode === 'phone-otp' && (
                <div className="space-y-4">
                  <p className="text-sm text-center text-muted-foreground">
                    Enter the 6-digit code sent to +91 {formData.phone}
                  </p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={formData.otp}
                      onChange={(value) => setFormData(prev => ({ ...prev, otp: value }))}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode('login')}
                  >
                    Didn't receive code? Resend
                  </Button>
                </div>
              )}

              {mode === 'phone-name' && (
                <div className="space-y-2">
                  <Label htmlFor="phoneName">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phoneName"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' && 'Send OTP'}
                    {mode === 'phone-otp' && 'Verify OTP'}
                    {mode === 'phone-name' && 'Complete Signup'}
                  </>
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthPage;
