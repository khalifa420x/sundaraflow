import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Dashboard from '@/components/Dashboard';
import Features from '@/components/Features';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import CTAFinal from '@/components/CTAFinal';
import Footer from '@/components/Footer';
import AnimationInit from '@/components/AnimationInit';

export default function Page() {
  return (
    <>
      <AnimationInit />
      <Header />
      <main>
        <Hero />
        <Dashboard />
        <Features />
        <Testimonials />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
    </>
  );
}
