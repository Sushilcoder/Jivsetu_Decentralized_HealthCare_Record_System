// Doctor Signup Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { useDoctorAuth } from '@/context/doctor-auth-context';
import { AlertCircle, CheckCircle, Loader, Eye, EyeOff } from 'lucide-react';

export default function DoctorSignupPage() {
  const router = useRouter();
  const { signup } = useDoctorAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [validation, setValidation] = useState({
    usernameLength: false,
    passwordLength: false,
    passwordMatch: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);

    // Real-time validation
    if (name === 'username') {
      setValidation(prev => ({
        ...prev,
        usernameLength: value.length >= 3,
      }));
    }
    if (name === 'password') {
      setValidation(prev => ({
        ...prev,
        passwordLength: value.length >= 6,
        passwordMatch: value === formData.confirmPassword,
      }));
    }
    if (name === 'confirmPassword') {
      setValidation(prev => ({
        ...prev,
        passwordMatch: value === formData.password,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.username.trim()) {
        setError('Please enter a username');
        setIsLoading(false);
        return;
      }

      if (formData.username.length < 3) {
        setError('Username must be at least 3 characters');
        setIsLoading(false);
        return;
      }

      if (!formData.password) {
        setError('Please enter a password');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      const result = await signup(formData.username, formData.password);

      if (result.success) {
        setSuccess(true);
        console.log('[v0] Signup successful, redirecting to dashboard');
        // Redirect after brief success message
        setTimeout(() => {
          router.push('/doctor');
        }, 1500);
      } else {
        setError(result.message || 'Signup failed');
      }
    } catch (err) {
      console.error('[v0] Signup error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-muted-foreground hover:text-foreground mb-6 inline-block">
            {'\u2190'} Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground">Join as a healthcare provider</p>
        </div>

        {/* Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create your doctor account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-700 dark:text-red-400">{error}</span>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-400">Account created successfully!</span>
                </Alert>
              )}

              <FieldGroup>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading || success}
                  required
                />
                <div className="mt-2 text-sm flex items-center gap-2">
                  {validation.usernameLength ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">At least 3 characters</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">At least 3 characters</span>
                    </>
                  )}
                </div>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading || success}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-sm flex items-center gap-2">
                  {validation.passwordLength ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">At least 6 characters</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">At least 6 characters</span>
                    </>
                  )}
                </div>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading || success}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-sm flex items-center gap-2">
                  {validation.passwordMatch && formData.confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Passwords must match</span>
                    </>
                  )}
                </div>
              </FieldGroup>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || success || !validation.usernameLength || !validation.passwordLength || !validation.passwordMatch}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Account created!
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/doctor/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">Password Requirements</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• At least 6 characters long</li>
            <li>• Mix of uppercase and lowercase recommended</li>
            <li>• Numbers and symbols recommended</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
