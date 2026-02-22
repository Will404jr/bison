import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-muted sm:block">
        <Image
          src="/market.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
      </div>

      <div className="flex w-full flex-col justify-center gap-8 px-8 py-12 sm:w-1/2 sm:max-w-md sm:px-12 lg:px-16">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Queue management
        </h1>
        <nav
          className="flex flex-col gap-4"
          aria-label="Main"
        >
          <Link
            href="/kiosk"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Customer kiosk
          </Link>
          <Link
            href="/teller/login"
            className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Teller login
          </Link>
          <Link
            href="/display"
            className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Display board
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Settings
          </Link>
        </nav>
      </div>
    </div>
  );
}
