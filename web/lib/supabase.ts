'use client';
import {createBrowserClient} from '@supabase/ssr';
const apiKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,apiKey!);
