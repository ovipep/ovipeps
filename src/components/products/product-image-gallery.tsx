"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductImageGalleryProps {
  productName: string;
  images: string[];
}

export function ProductImageGallery({ productName, images }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex];

  if (!selectedImage) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl border border-sky/15 bg-gradient-to-br from-sky/5 via-white to-cyan/5">
        <div className="h-40 w-40 rounded-full border border-dashed border-sky/20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-sky/15 bg-gradient-to-br from-sky/5 via-white to-cyan/5 shadow-xl shadow-sky/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.08),transparent_50%)]" />
        <Image
          src={selectedImage}
          alt={selectedIndex === 0 ? productName : `${productName} alternate product view`}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-10 transition-transform duration-500 hover:scale-105"
          priority={selectedIndex === 0}
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3" aria-label={`${productName} product images`}>
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`View ${productName} image ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-white transition ${
                selectedIndex === index
                  ? "border-sky shadow-md shadow-sky/15"
                  : "border-slate-200 hover:border-sky/50"
              }`}
            >
              <Image src={image} alt="" fill sizes="80px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
