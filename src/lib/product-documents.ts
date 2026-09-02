export interface ProductDocument {
  label: string;
  url: string;
}

export const PRODUCT_DOCUMENTS: Record<string, ProductDocument> = {
  "cjc-ipamorelin": {
    label: "CJC/Ipamorelin Guide",
    url: "/documents/cjc-1295-ipamorelin-guide.png",
  },
  "ss-31": {
    label: "SS-31 Guide",
    url: "/documents/ss-31-guide.png",
  },
  "nad-plus": {
    label: "NAD+ Guide",
    url: "/documents/nad-plus-guide.png",
  },
  "bpc-157": {
    label: "BPC-157 Guide",
    url: "/documents/bpc-157-guide.png",
  },
  "tb-500": {
    label: "TB-500 Guide",
    url: "/documents/tb-500-guide.png",
  },
  "mots-c": {
    label: "MOT-C Guide",
    url: "/documents/mot-c-guide.png",
  },
  "bpc157-tb500": {
    label: "Wolverine Stack Guide",
    url: "/documents/wolverine-stack-guide.png",
  },
  "klow": {
    label: "KLOW Guide",
    url: "/documents/klow-guide.png",
  },
  "kpv": {
    label: "KPV Guide",
    url: "/documents/kpv-guide.png",
  },
};

export function getProductDocument(productSlug: string) {
  return PRODUCT_DOCUMENTS[productSlug];
}
