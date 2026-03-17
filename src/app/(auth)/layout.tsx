export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">DocuFlow</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Document Automation for Malaysian SMEs
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
