'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Shield, Lock, Share2, Users, Zap, FileCheck } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-pretty leading-tight mb-6">
                Your Health Records,
                <span className="text-primary"> Your Control</span>
              </h1>
              <p className="text-lg text-muted-foreground text-pretty mb-8">
                Jivsetu is a decentralized healthcare records system where doctors securely upload reports and patients maintain complete control over who can access their medical data.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/patient-connect">
                  <Button size="lg" className="text-base w-full sm:w-auto">
                    <Shield className="w-4 h-4 mr-2" />
                    Connect as Patient
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card className="p-6 bg-secondary/50 hover:bg-secondary/70 transition">
                  <Shield className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Encrypted</h3>
                  <p className="text-sm text-muted-foreground">End-to-end encryption for all records</p>
                </Card>
                <Card className="p-6 bg-secondary/50 hover:bg-secondary/70 transition">
                  <Lock className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Secure</h3>
                  <p className="text-sm text-muted-foreground">Blockchain-verified access control</p>
                </Card>
              </div>
              <div className="space-y-4 pt-8">
                <Card className="p-6 bg-secondary/50 hover:bg-secondary/70 transition">
                  <Share2 className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Control</h3>
                  <p className="text-sm text-muted-foreground">Grant or revoke access instantly</p>
                </Card>
                <Card className="p-6 bg-secondary/50 hover:bg-secondary/70 transition">
                  <Zap className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Instant</h3>
                  <p className="text-sm text-muted-foreground">Real-time record synchronization</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-pretty">
              How Jivsetu Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              A seamless workflow designed for modern healthcare
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Doctors Feature */}
            <Card className="p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Doctors</h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Upload encrypted medical reports
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Add patient information securely
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Track access history
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Audit all file submissions
                </li>
              </ul>
            </Card>

            {/* Patients Feature */}
            <Card className="p-8 hover:shadow-lg transition md:mt-8">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Patients</h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  View all your medical records
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Grant permissions to doctors
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Revoke access anytime
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  See who accessed your data
                </li>
              </ul>
            </Card>

            {/* Privacy Feature */}
            <Card className="p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Decentralized storage with IPFS
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Smart contract verification
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  No central authority control
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  HIPAA-ready architecture
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-pretty text-center">
            Get Started Today
          </h2>
          <p className="text-lg text-muted-foreground mb-12 text-pretty text-center">
            Choose your role and join the decentralized healthcare revolution
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Doctor CTA */}
            <Card className="p-8 hover:shadow-lg transition hover:border-primary">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Healthcare Providers</h3>
              <p className="text-muted-foreground mb-6">Upload and manage encrypted medical reports securely</p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Secure IPFS storage</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Patient-controlled access</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Access audit trails</span>
                </li>
              </ul>
              <Link href="/doctor-connect" className="block">
                <Button className="w-full" size="lg">
                  Connect as Healthcare Provider
                </Button>
              </Link>
            </Card>

            {/* Patient CTA */}
            <Card className="p-8 hover:shadow-lg transition hover:border-primary">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Patients</h3>
              <p className="text-muted-foreground mb-6">Manage your health data with complete control and privacy</p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Complete privacy control</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Grant/revoke access instantly</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>View access history</span>
                </li>
              </ul>
              <Link href="/patient-connect" className="block">
                <Button className="w-full" size="lg" variant="outline">
                  Connect as Patient
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}
