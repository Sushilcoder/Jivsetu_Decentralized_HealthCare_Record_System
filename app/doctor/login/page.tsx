// Doctor Login Page
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
import { AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';

export default function DoctorLoginPage() {
  const router = useRouter();
  const { login } = useDoctorAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.username.trim()) {
        setError('Please enter your username');
        setIsLoading(false);
        return;
      }

      if (!formData.password) {
        setError('Please enter your password');
        setIsLoading(false);
        return;
      }

      const result = await login(formData.username, formData.password);

      if (result.success) {
        console.log('[v0] Login successful, redirecting to dashboard');
        router.push('/doctor');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      console.error('[v0] Login error:', err);
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
          <h1 className="text-4xl font-bold mb-2">Doctor Login</h1>
          <p className="text-muted-foreground">Access your healthcare dashboard</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-700 dark:text-red-400">{error}</span>
                </Alert>
              )}

              <FieldGroup>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
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
              </FieldGroup>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Signup Link */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don{`'`}t have an account?{' '}
              <Link href="/doctor/signup" className="text-primary hover:underline font-medium">
                Sign up here
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">Secure</div>
            <p className="text-xs text-muted-foreground">Password protected</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">Quick</div>
            <p className="text-xs text-muted-foreground">Fast login process</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">Easy</div>
            <p className="text-xs text-muted-foreground">No email required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
