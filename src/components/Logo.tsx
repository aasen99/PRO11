import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  priority?: boolean
  className?: string
}

export default function Logo({ priority = false, className = 'w-24 h-24' }: LogoProps) {
  return (
    <Link
      href="/"
      className={`flex items-center justify-center hover:opacity-80 transition-opacity ${className}`}
    >
      <Image
        src="/logo.png"
        alt="PRO11 Logo"
        width={96}
        height={96}
        className="w-full h-full object-contain"
        priority={priority}
      />
    </Link>
  )
}
