import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from './brand';

const navigation = [{to:'/',label:'Home'},{to:'/about',label:'About us'},{to:'/services',label:'Services'},{to:'/contact',label:'Contact'}] as const;
export function Header() {
  const [open,setOpen] = useState(false);
  return <header className="relative z-20 bg-background"><div className="site-width flex h-[88px] items-center justify-between"><Link to="/" className="brand" aria-label="Aangan home"><BrandMark/>aangan<span className="text-primary">.</span></Link><nav aria-label="Main navigation" className="hidden items-center gap-9 md:flex">{navigation.map(n=><Link key={n.to} to={n.to} className="nav-link" activeOptions={{exact:true}}>{n.label}</Link>)}</nav><Button variant="outline" asChild className="hidden h-10 text-xs md:inline-flex"><Link to="/contact">Let’s talk <ArrowUpRight/></Link></Button><Button variant="ghost" size="icon" className="md:hidden" aria-label={open?'Close menu':'Open menu'} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</Button></div>{open&&<nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full flex flex-col border-b bg-background px-6 py-4 md:hidden">{navigation.map(n=><Link key={n.to} to={n.to} className="nav-link" onClick={()=>setOpen(false)}>{n.label}</Link>)}</nav>}</header>;
}
export function Footer() {
 return <footer className="border-t"><div className="site-width flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between"><div><Link to="/" className="brand text-2xl"><BrandMark/>aangan.</Link><p className="mt-3 text-xs text-muted-foreground">A place for new beginnings.</p></div><nav className="flex flex-wrap gap-6" aria-label="Footer navigation">{navigation.slice(1).map(n=><Link className="text-xs text-muted-foreground hover:text-primary" key={n.to} to={n.to}>{n.label}</Link>)}</nav><p className="text-[11px] text-muted-foreground">© 2026 Aangan Real Estate · Nepal</p></div></footer>;
}
export function ContactBand() {
 return <section className="bg-secondary py-14"><div className="site-width flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"><div><p className="eyebrow mb-3 text-primary">YOUR NEXT CHAPTER</p><h2 className="section-title">Good things begin with a conversation.</h2></div><Button asChild size="lg" className="h-12"><Link to="/contact">Let’s find your place <ArrowUpRight/></Link></Button></div></section>;
}
