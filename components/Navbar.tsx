import { getCurrentUser, isAdminUser } from '@/lib/supabase/user';
import SiteNav from './SiteNav';

export default async function Navbar() {
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);

  return <SiteNav user={user} isAdmin={isAdmin} />;
}
