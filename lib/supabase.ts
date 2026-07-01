type TableName = 'camps' | 'budget_categories' | 'expenses';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

async function request(table: TableName, options: RequestInit, query = '') {
  if (!isSupabaseConfigured) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey as string,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Supabase ${table}: ${response.status}`);
  return response;
}

export const supabase = isSupabaseConfigured
  ? {
      from(table: TableName) {
        return {
          upsert(payload: unknown) {
            return request(table, {
              method: 'POST',
              body: JSON.stringify(payload),
              headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            });
          },
          delete() {
            return {
              eq(column: string, value: string) {
                return request(table, { method: 'DELETE' }, `?${column}=eq.${encodeURIComponent(value)}`);
              },
            };
          },
        };
      },
    }
  : null;
