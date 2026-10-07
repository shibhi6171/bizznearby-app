// Unwrap a Supabase query: return data or throw the error.
export async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// '' and undefined become null so optional form fields clear properly.
export const nn = (v) => (v === '' || v === undefined ? null : v);
