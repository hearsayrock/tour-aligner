export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-theme="cream" className="auth-page min-h-screen flex items-center justify-center bg-page px-4 py-10">
      {children}
    </div>
  )
}
