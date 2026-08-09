import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { IMPORT_COLUMNS } from '@/lib/csv-import';

/** Download a blank CSV template containing only the importable columns. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csv = IMPORT_COLUMNS.join(',');

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="alumni-import-template.csv"',
    },
  });
}
