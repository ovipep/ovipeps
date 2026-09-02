export const CJC_IPAMORELIN_GUIDE = {
  productSlug: "cjc-ipamorelin",
  label: "CJC/Ipamorelin Guide",
  url: "/documents/cjc-1295-ipamorelin-guide.png",
} as const;

export function hasCjcIpamorelinGuide(productSlug: string) {
  return productSlug === CJC_IPAMORELIN_GUIDE.productSlug;
}
