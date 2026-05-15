export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-secondary via-background to-accent">
      <div className="w-full max-w-md p-6">{children}</div>
    </div>
  );
}
