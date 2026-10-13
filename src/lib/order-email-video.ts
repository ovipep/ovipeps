export const RECONSTITUTE_VIDEO_URL = "https://drive.google.com/file/d/188xcR2g-WwvaK3zS6lT6O2erzcDkTpXo/view?usp=drivesdk";

export function orderIncludesPeptides(products: { category: string }[]) {
  return products.some((product) => product.category === "RESEARCH_PEPTIDE" || product.category === "BUNDLE");
}

export function reconstituteVideoSection() {
  return {
    text: `\n\nRECONSTITUTE VIDEO\nWatch Reconstitute video: ${RECONSTITUTE_VIDEO_URL}`,
    html: `<div style="margin:24px 0;padding:20px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;"><h2 style="margin:0 0 14px;font-size:18px;color:#075985;">Reconstitute video</h2><a href="${RECONSTITUTE_VIDEO_URL}" style="display:inline-block;background:#075985;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;">Watch Reconstitute video</a></div>`,
  };
}
