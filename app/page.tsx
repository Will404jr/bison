import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-blend-void sm:block">
        <Image
          src="/market.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-blend-void/80 via-blend-void/15 to-background/40" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-4 border-t border-white/10 bg-card/45 px-8 py-5 text-foreground backdrop-blur-2xl">
          <Image
            src="/logo.png"
            alt="Company logo"
            width={200}
            height={91}
            className="h-14 w-auto shrink-0 object-contain"
            priority
          />
          <p className="text-lg font-semibold leading-snug">
            Branch queue hub
          </p>
        </div>
      </div>

      <div className="glass-panel flex w-full flex-col justify-center gap-8 rounded-none px-8 py-12 sm:w-1/2 sm:max-w-md sm:rounded-l-3xl sm:border-l sm:px-12 lg:px-16">
        <div>
          <Image
            src="/logo.png"
            alt="Company logo"
            width={200}
            height={91}
            className="mb-4 h-16 w-auto object-contain"
            priority
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Welcome
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Queue management
          </h1>
        </div>
        <nav
          className="flex flex-col gap-4"
          aria-label="Main"
        >
          <Link
            href="/menu/login"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Customer Menu
          </Link>
          <Link
            href="/teller/login"
            className="inline-flex h-12 items-center justify-center rounded-md glass-panel px-6 font-medium transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Teller login
          </Link>
          <Link
            href="/display/login"
            className="inline-flex h-12 items-center justify-center rounded-md glass-panel px-6 font-medium transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Display board
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-md glass-panel px-6 font-medium transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Dashboard
          </Link>
          {/* <Link
            href="/settings"
            className="inline-flex h-12 items-center justify-center rounded-md glass-panel px-6 font-medium transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Settings
          </Link> */}
        </nav>
      </div>
    </div>
  );
}
