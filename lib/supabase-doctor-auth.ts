import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface DoctorAccount {
  id: string
  username: string
  email?: string
  wallet_address?: string
  created_at: string
  last_login?: string
}

export async function signupDoctor(
  username: string,
  password: string,
  email?: string
): Promise<{ success: boolean; message: string; data?: DoctorAccount }> {
  try {
    // Validate username
    if (username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters' }
    }

    // Validate password
    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' }
    }

    // Check if username already exists
    const { data: existingDoctor } = await supabase
      .from('doctor_accounts')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existingDoctor) {
      return { success: false, message: 'Username already exists' }
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new doctor account
    const { data, error } = await supabase
      .from('doctor_accounts')
      .insert([
        {
          username: username.toLowerCase(),
          password_hash: hashedPassword,
          email: email || null,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[v0] Signup error:', error)
      return { success: false, message: error.message }
    }

    console.log('[v0] Doctor signup successful:', data.username)

    return {
      success: true,
      message: 'Account created successfully',
      data: {
        id: data.id,
        username: data.username,
        email: data.email,
        wallet_address: data.wallet_address,
        created_at: data.created_at,
        last_login: data.last_login,
      },
    }
  } catch (error) {
    console.error('[v0] Signup error:', error)
    return { success: false, message: 'An error occurred during signup' }
  }
}

export async function loginDoctor(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; data?: DoctorAccount }> {
  try {
    // Get doctor account
    const { data: doctor, error } = await supabase
      .from('doctor_accounts')
      .select('*')
      .eq('username', username.toLowerCase())
      .single()

    if (error || !doctor) {
      console.log('[v0] Login failed: Doctor not found')
      return { success: false, message: 'Invalid username or password' }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, doctor.password_hash)

    if (!isPasswordValid) {
      console.log('[v0] Login failed: Invalid password for', username)
      return { success: false, message: 'Invalid username or password' }
    }

    // Update last login timestamp
    await supabase
      .from('doctor_accounts')
      .update({ last_login: new Date().toISOString() })
      .eq('id', doctor.id)

    console.log('[v0] Doctor login successful:', username)

    return {
      success: true,
      message: 'Login successful',
      data: {
        id: doctor.id,
        username: doctor.username,
        email: doctor.email,
        wallet_address: doctor.wallet_address,
        created_at: doctor.created_at,
        last_login: doctor.last_login,
      },
    }
  } catch (error) {
    console.error('[v0] Login error:', error)
    return { success: false, message: 'An error occurred during login' }
  }
}

export async function getDoctorById(id: string): Promise<DoctorAccount | null> {
  try {
    const { data, error } = await supabase
      .from('doctor_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      username: data.username,
      email: data.email,
      wallet_address: data.wallet_address,
      created_at: data.created_at,
      last_login: data.last_login,
    }
  } catch (error) {
    console.error('[v0] Error fetching doctor:', error)
    return null
  }
}

export async function updateDoctorWallet(
  doctorId: string,
  walletAddress: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('doctor_accounts')
      .update({ wallet_address: walletAddress })
      .eq('id', doctorId)

    if (error) {
      console.error('[v0] Error updating wallet:', error)
      return false
    }

    console.log('[v0] Doctor wallet updated:', walletAddress)
    return true
  } catch (error) {
    console.error('[v0] Error updating wallet:', error)
    return false
  }
}
