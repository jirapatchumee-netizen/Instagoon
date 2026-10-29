'use client';
import { useEffect, useState } from 'react';

const sizes=[100,110,120,130,140];
export function FontControls() {
  const [size,setSize]=useState(100);
  useEffect(()=>{try {const saved=Number(localStorage.getItem('npc-studio-font-size'));if(sizes.includes(saved))setSize(saved);}catch{/* browser storage may be unavailable */}},[]);
  function change(next:number) { setSize(next); try {localStorage.setItem('npc-studio-font-size',String(next));}catch{/* setting still applies for this session */} }
  useEffect(()=>{document.documentElement.style.setProperty('--font-scale',String(size/100));},[size]);
  const index=sizes.indexOf(size);
  return <div className="font-controls" role="group" aria-label="ปรับขนาดตัวอักษร"><span>ขนาดตัวอักษร</span><button aria-label="ลดขนาดตัวอักษร" disabled={index===0} onClick={()=>change(sizes[index-1])}>A−</button><button aria-label="กลับขนาดตัวอักษรปกติ" title="กลับขนาดปกติ" onClick={()=>change(100)}>{size}%</button><button aria-label="เพิ่มขนาดตัวอักษร" disabled={index===sizes.length-1} onClick={()=>change(sizes[index+1])}>A+</button></div>;
}
