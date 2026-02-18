import { NextResponse } from 'next/server'
import { createMissionProcessor } from '@/lib/missions'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    try {
        // Create a service-role client for server-side processing
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const processor = createMissionProcessor(supabase)
        const result = await processor.processPendingMissions()
        return NextResponse.json({ ...result, message: 'Missions processed' })
    } catch (error) {
        console.error('Error in mission processing route:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}

// Allow POST as well for flexibility
export async function POST() {
    return GET()
}
