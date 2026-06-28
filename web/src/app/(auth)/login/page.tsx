import { WebGLBackground } from '@/components/auth/WebGLBackground'
import { LightningText }   from '@/components/auth/LightningText'
import { LoginForm }       from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main
      className="dark relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#07070b' }}
    >
      {/* WebGL fine-lattice ambient background */}
      <WebGLBackground />

      {/* Radial violet glow behind centre content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 65% 55% at 50% 42%, rgba(139,92,246,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Content column */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 w-full animate-slide-up">

        {/* Lightning sweep headline */}
        <LightningText line1="Tree Census" line2="Field Portal" />

        {/* Login card */}
        <LoginForm />
      </div>
    </main>
  )
}
