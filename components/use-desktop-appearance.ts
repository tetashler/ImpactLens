'use client';
import {useEffect,useState} from 'react';

/** Presentation preference only; desktop uses the approved light paper theme. */
export function useDesktopAppearance() {
 const [appearance,setAppearance]=useState<'light'|'dark'>('dark');
 useEffect(()=>{
  const query=window.matchMedia('(min-width: 701px)');
  const update=()=>setAppearance(query.matches?'light':'dark');
  update();query.addEventListener('change',update);
  return()=>query.removeEventListener('change',update);
 },[]);
 return appearance;
}
