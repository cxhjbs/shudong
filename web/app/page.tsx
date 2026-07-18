'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '@/lib/supabase';
import App from '@/components/App';
import Lock from '@/components/Lock';
export default function Page(){const router=useRouter(),[session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false);useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);if(!data.session)router.replace('/login')});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(!next)router.replace('/login')});return()=>subscription.unsubscribe()},[router]);if(!ready||!session)return <main className="grid min-h-screen place-items-center text-stone-500">正在打开树洞...</main>;return <Lock><App user={session.user}/></Lock>}
