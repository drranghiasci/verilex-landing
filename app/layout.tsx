// app/layout.tsx
import '@/styles/globals.css';
export const metadata = { title: "Default Title", description: "Default description" };

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
