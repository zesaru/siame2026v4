import { NextRequest, NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/dashboard'

// Revalidate dashboard metrics every 5 minutes (data doesn't change frequently)
export const revalidate = 300

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    const metrics = await getDashboardMetrics(userId)

    // Add cache headers for better performance
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300'
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}