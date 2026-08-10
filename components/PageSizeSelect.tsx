'use client';

// Selector ukuran halaman untuk tabel admin. Komponen ini client-side karena
// `onChange` (auto-submit form) tidak bisa diserialisasi dari Server Component.
type PageSizeSelectProps = {
  /** id unik untuk elemen select (dipakai label htmlFor). */
  id: string;
  /** URL tujuan submit form (mis. /admin/alumni). */
  action: string;
  /** Ukuran halaman yang sedang aktif. */
  pageSize: number;
  /** Daftar ukuran yang tersedia. */
  sizes: readonly number[];
  /** Input hidden yang dipertahankan saat submit (mis. query pencarian). */
  hidden?: [name: string, value: string][];
};

export default function PageSizeSelect({
  id,
  action,
  pageSize,
  sizes,
  hidden,
}: PageSizeSelectProps) {
  return (
    <form
      method="get"
      action={action}
      className="flex items-center gap-2 text-sm text-on-surface-variant"
    >
      {hidden?.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor={id}>Tampilkan</label>
      <select
        id={id}
        name="size"
        defaultValue={pageSize}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="input-field w-auto"
      >
        {sizes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span>per halaman</span>
    </form>
  );
}
