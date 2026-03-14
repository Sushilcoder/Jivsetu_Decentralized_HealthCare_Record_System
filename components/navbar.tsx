import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { useDoctorAuth } from '@/context/doctor-auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, X, User, Sun, Moon, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Navbar() {
  const { user, isConnected, connectWallet, disconnectWallet } = useAuth()
  const { session, logout: logoutDoctor } = useDoctorAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleDoctorLogout = () => {
    logoutDoctor()
    router.push('/doctor/login')
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getProfilePath = () => {
    if (user?.role === 'doctor') return '/doctor/profile'
    if (user?.role === 'patient') return '/patient/profile'
    return '/'
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm">
              J
            </div>
            Jivsetu
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {isConnected && user ? (
              <>
                {user.role === 'doctor' && (
                  <Link href="/doctor" className="text-sm text-muted-foreground hover:text-foreground transition">
                    Doctor Dashboard
                  </Link>
                )}
                {user.role === 'patient' && (
                  <Link href="/patient" className="text-sm text-muted-foreground hover:text-foreground transition">
                    Patient Dashboard
                  </Link>
                )}
              </>
            ) : null}
          </div>

          {/* Theme Toggle & Auth Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Doctor Auth Dropdown - Show when not logged in as doctor */}
            {!session && !isConnected && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Doctor</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/doctor/login" className="cursor-pointer">
                      <LogIn className="w-4 h-4 mr-2" />
                      Doctor Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/doctor/signup" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Doctor Signup
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {isConnected && user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.name || formatAddress(user.address)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href={getProfilePath()} className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={disconnectWallet} className="text-destructive cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : session ? (
              // Doctor logged in
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Dr. {session.username}
                </span>
                <Button 
                  onClick={handleDoctorLogout} 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Button onClick={connectWallet} size="sm">
                Connect Wallet
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg transition"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && isConnected && user && (
          <div className="md:hidden pb-4 border-t border-border">
            {user.role === 'doctor' && (
              <Link
                href="/doctor"
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Doctor Dashboard
              </Link>
            )}
            {user.role === 'patient' && (
              <Link
                href="/patient"
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Patient Dashboard
              </Link>
            )}
            <Link
              href={getProfilePath()}
              className="block py-2 text-sm text-muted-foreground hover:text-foreground transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Profile
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
