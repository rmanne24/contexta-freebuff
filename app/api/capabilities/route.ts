import { NextResponse } from 'next/server';
import { actionCapability } from '@/lib/pipeline';

export async function GET() {
  return NextResponse.json(actionCapability());
}
