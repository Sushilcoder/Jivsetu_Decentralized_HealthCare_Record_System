'use server'

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface SignupResult {
  success: boolean
  message: string
  doctorId?: string
}

export interface LoginResult {
  success: boolean
  message: string
  doctorId?: string
  username?: string
}

export async function serverSignupDoctor(
  username: string,
  password: string,
  email?: string
): Promise<SignupResult> {
  try {
    console.log('[v0] Server signup attempt:', { username, email })

    if (username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters' }
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' }
    }

    // Check if username already exists
    const { data: existingDoctor, error: checkError } = await supabase
      .from('doctor_accounts')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existingDoctor) {
      return { success: false, message: 'Username already exists' }
    }

    // Hash password
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
      console.error('[v0] Server signup error:', error)
      return { success: false, message: `Signup failed: ${error.message}` }
    }

    console.log('[v0] Server signup successful:', data.id)
    return {
      success: true,
      message: 'Account created successfully',
      doctorId: data.id,
    }
  } catch (error) {
    console.error('[v0] Server signup exception:', error)
    return { success: false, message: 'An error occurred during signup' }
  }
}

export async function serverLoginDoctor(
  username: string,
  password: string
): Promise<LoginResult> {
  try {
    console.log('[v0] Server login attempt:', { username })

    // Get doctor account
    const { data: doctor, error } = await supabase
      .from('doctor_accounts')
      .select('*')
      .eq('username', username.toLowerCase())
      .single()

    if (error || !doctor) {
      console.log('[v0] Server login failed: Doctor not found')
      return { success: false, message: 'Invalid username or password' }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, doctor.password_hash)

    if (!isPasswordValid) {
      console.log('[v0] Server login failed: Invalid password')
      return { success: false, message: 'Invalid username or password' }
    }

    // Update last login
    await supabase
      .from('doctor_accounts')
      .update({ last_login: new Date().toISOString() })
      .eq('id', doctor.id)

    console.log('[v0] Server login successful:', username)
    return {
      success: true,
      message: 'Login successful',
      doctorId: doctor.id,
      username: doctor.username,
    }
  } catch (error) {
    console.error('[v0] Server login exception:', error)
    return { success: false, message: 'An error occurred during login' }
  }
}
