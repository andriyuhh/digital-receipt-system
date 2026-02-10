import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const SEED_ADMIN_EMAIL = 'officeadmin@coworkingspacesl.com'
const SEED_ADMIN_PASSWORD = 'c0work1ng@'

export async function POST() {
  try {
    const supabase = createAdminClient()
    
    // Check if seed admin already exists in staff table
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .limit(1)
    
    if (existingStaff && existingStaff.length > 0) {
      return NextResponse.json({ 
        message: 'System already initialized',
        initialized: true 
      })
    }
    
    // Create seed admin using Supabase Auth Admin API (service role key)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: SEED_ADMIN_EMAIL,
      password: SEED_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Office Administrator',
        role: 'Admin'
      }
    })
    
    if (authError) {
      // User might already exist in auth but not in staff table
      const isEmailExists =
        (authError as Record<string, unknown>).code === 'email_exists' ||
        authError.message?.includes('already been registered') ||
        authError.message?.includes('already exists') ||
        authError.status === 422

      if (isEmailExists) {
        // Find the existing auth user
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existingUser = listData?.users?.find(
          u => u.email?.toLowerCase() === SEED_ADMIN_EMAIL.toLowerCase()
        )

        if (existingUser) {
          // Check if staff record already exists (use maybeSingle to avoid 406 on 0 rows)
          const { data: existingStaffRecord } = await supabase
            .from('staff')
            .select('id')
            .eq('id', existingUser.id)
            .maybeSingle()

          if (existingStaffRecord) {
            return NextResponse.json({
              message: 'System already initialized',
              initialized: true,
              email: SEED_ADMIN_EMAIL,
            })
          }

          // Auth user exists but staff record is missing — create it
          const { error: staffError } = await supabase
            .from('staff')
            .insert({
              id: existingUser.id,
              email: SEED_ADMIN_EMAIL,
              full_name: 'Office Administrator',
              role: 'Admin',
              is_active: true,
              must_change_password: true,
              rules_acknowledged: true,
            })

          if (!staffError) {
            await supabase.from('audit_log').insert({
              action: 'SEED_ADMIN_CREATED',
              performed_by: existingUser.id,
              performed_by_name: 'System',
              performed_by_role: 'System',
              reason: 'Seed admin account linked during re-initialization',
            })

            return NextResponse.json({
              success: true,
              message: 'Seed admin linked successfully',
              email: SEED_ADMIN_EMAIL,
              note: 'Password must be changed on first login',
            })
          }
        }

        return NextResponse.json({
          message: 'Admin already exists',
          initialized: true,
        })
      }
      throw authError
    }
    
    if (!authData.user) {
      throw new Error('Failed to create seed admin user')
    }
    
    // Create staff record
    const { error: staffError } = await supabase
      .from('staff')
      .insert({
        id: authData.user.id,
        email: SEED_ADMIN_EMAIL,
        full_name: 'Office Administrator',
        role: 'Admin',
        is_active: true,
        must_change_password: true,
        rules_acknowledged: true,
      })
    
    if (staffError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw staffError
    }
    
    // Log the creation
    await supabase.from('audit_log').insert({
      action: 'SEED_ADMIN_CREATED',
      performed_by: authData.user.id,
      performed_by_name: 'System',
      performed_by_role: 'System',
      reason: 'Initial seed admin account created during system initialization'
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Seed admin created successfully',
      email: SEED_ADMIN_EMAIL,
      note: 'Password must be changed on first login'
    })
  } catch (error) {
    console.error('Error initializing seed admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize system' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Check if any staff exists
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id')
      .limit(1)
    
    if (error) throw error
    
    return NextResponse.json({
      initialized: staff && staff.length > 0,
      seedAdminEmail: SEED_ADMIN_EMAIL
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    )
  }
}
