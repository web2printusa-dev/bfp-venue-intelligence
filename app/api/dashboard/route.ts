import {NextResponse} from 'next/server';
import {dashboard} from '@/lib/demo-store';
export async function GET(){return NextResponse.json(dashboard())}
