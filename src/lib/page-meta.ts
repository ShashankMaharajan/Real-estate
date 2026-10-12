export function pageMeta(title: string, description: string) {
  return { meta: [{title: `${title} — Aangan Real Estate`},{name:'description',content:description},{property:'og:title',content:`${title} — Aangan Real Estate`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] };
}
