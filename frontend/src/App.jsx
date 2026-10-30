import { useEffect } from 'react'
import gsap from 'gsap'
import Studio from './components/Studio'
import { Navbar, Features, How, About, Footer } from './components/Sections'
export default function App() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.from('[data-hero]', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out' })
    gsap.from('#studio .glass', { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.25, ease: 'power3.out' })
  }, [])
  return <div id="home"><Navbar /><main><Studio /><Features /><How /><About /></main><Footer /></div>
}
