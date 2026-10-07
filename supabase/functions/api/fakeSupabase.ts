// Tiny in-memory stand-in for the parts of supabase-js the API uses. Test-only.
// deno-lint-ignore-file no-explicit-any
type Row = Record<string, any>;
const REL: Record<string, Record<string, { table: string; fk: string; many?: boolean }>> = {
  businesses: { categories: { table: 'categories', fk: 'category_id' }, business_images: { table: 'business_images', fk: 'business_id', many: true }, deals: { table: 'deals', fk: 'business_id', many: true } },
  reviews: { users: { table: 'users', fk: 'user_id' }, businesses: { table: 'businesses', fk: 'business_id' } },
  deals: { businesses: { table: 'businesses', fk: 'business_id' } },
  leads: { businesses: { table: 'businesses', fk: 'business_id' }, users: { table: 'users', fk: 'user_id' } },
};

export function createFakeSupabase(opts: { rpc?: (name: string, args: any) => any } = {}) {
  const tables: Record<string, Row[]> = {
    users: [], categories: [{ id: 1, slug: 'dining', name: 'Dining' }, { id: 2, slug: 'retail', name: 'Retail' }],
    businesses: [], business_images: [], deals: [], reviews: [], leads: [],
  };
  const files = new Set<string>();
  const rpcCalls: any[] = [];

  const relOne = (table: string, row: Row, name: string) => {
    const d = REL[table]?.[name];
    return d ? (d.many ? tables[d.table].filter((r) => r[d.fk] === row.id) : tables[d.table].find((r) => r.id === row[d.fk]) ?? null) : undefined;
  };
  function refreshRating(businessId: string) {
    const rs = tables.reviews.filter((r) => r.business_id === businessId);
    const b = tables.businesses.find((x) => x.id === businessId);
    if (b) { b.review_count = rs.length; b.avg_rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0; }
  }
  const defaults: Record<string, () => Row> = {
    users: () => ({ role: 'customer', phone: null, business_name: null }),
    businesses: () => ({ is_active: true, avg_rating: 0, review_count: 0 }),
    business_images: () => ({ is_cover: false }),
    deals: () => ({ is_active: true, starts_at: new Date().toISOString() }),
  };

  class Q {
    filters: [string, any][] = []; notNull: string[] = []; op = 'select'; payload: any; sel = '*'; returning = false;
    sort?: [string, boolean]; lim?: number; rng?: [number, number]; mode: 'many' | 'one' | 'maybe' = 'many';
    constructor(public table: string) {}
    select(s = '*') { this.sel = s; if (this.op !== 'select') this.returning = true; return this; }
    insert(p: any) { this.op = 'insert'; this.payload = p; return this; }
    update(p: any) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(k: string, v: any) { this.filters.push([k, v]); return this; }
    not(k: string) { this.notNull.push(k); return this; }
    order(k: string, o: any = {}) { this.sort = [k, o.ascending !== false]; return this; }
    limit(n: number) { this.lim = n; return this; }
    range(a: number, b: number) { this.rng = [a, b]; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }
    single() { this.mode = 'one'; return this; }
    then(res?: any, rej?: any): any { return Promise.resolve(this.exec()).then(res, rej); }

    exec() {
      const t = tables[this.table];
      const match = (r: Row) => this.filters.every(([k, v]) => {
        if (k.includes('.')) { const [rel, col] = k.split('.'); const e: any = relOne(this.table, r, rel); return e && e[col] === v; }
        return r[k] === v;
      }) && this.notNull.every((k) => r[k] != null);
      const embed = (r: Row) => {
        const out = { ...r };
        for (const name of Object.keys(REL[this.table] || {})) if (this.sel.includes(name + '(') || this.sel.includes(name + '!')) out[name] = relOne(this.table, r, name);
        return out;
      };
      let rows: Row[] = [];
      if (this.op === 'insert') {
        for (const p of Array.isArray(this.payload) ? this.payload : [this.payload]) {
          if (this.table === 'users' && t.some((u) => u.email.toLowerCase() === p.email.toLowerCase())) return { data: null, error: { code: '23505' } };
          if (this.table === 'reviews' && t.some((r) => r.business_id === p.business_id && r.user_id === p.user_id)) return { data: null, error: { code: '23505' } };
          const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(defaults[this.table]?.() || {}), ...p };
          t.push(row); rows.push(row);
          if (this.table === 'reviews') refreshRating(row.business_id);
        }
      } else if (this.op === 'update') {
        rows = t.filter(match); rows.forEach((r) => Object.assign(r, this.payload));
      } else if (this.op === 'delete') {
        const gone = t.filter(match);
        tables[this.table] = t.filter((r) => !gone.includes(r));
        if (this.table === 'businesses') for (const c of ['business_images', 'deals', 'reviews', 'leads']) tables[c] = tables[c].filter((r) => !gone.some((g) => g.id === r.business_id));
        rows = gone;
      } else {
        rows = t.filter(match);
        if (this.sort) { const [k, asc] = this.sort; rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : -1) * (asc ? 1 : -1)); }
        if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
        if (this.lim) rows = rows.slice(0, this.lim);
      }
      if (this.op !== 'select' && !this.returning) return { data: null, error: null };
      rows = rows.map(embed);
      if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null };
      if (this.mode === 'one') return rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116' } };
      return { data: rows, error: null };
    }
  }

  return {
    tables, files, rpcCalls,
    from: (table: string) => new Q(table),
    rpc: (name: string, args: any) => { rpcCalls.push({ name, args }); return Promise.resolve({ data: opts.rpc ? opts.rpc(name, args) : [], error: null }); },
    storage: {
      from: () => ({
        upload: (path: string) => { files.add(path); return Promise.resolve({ error: null }); },
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://files.test/${p}` } }),
        remove: (paths: string[]) => { paths.forEach((p) => files.delete(p)); return Promise.resolve({ error: null }); },
      }),
    },
  };
}
