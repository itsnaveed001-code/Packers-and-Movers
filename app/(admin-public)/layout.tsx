// The admin login lives here and uses Tailwind/shadcn components, so it needs the
// global Tailwind stylesheet. Importing it in this group's layout keeps Tailwind
// loaded for admin-auth routes only — the public marketing tree stays Chakra-only.
import '@/app/globals.css';

export default function AdminPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
