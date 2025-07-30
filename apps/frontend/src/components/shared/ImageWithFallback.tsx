import { useEffect, useState } from "react";
import Image from "next/image";

interface ImageWithFallbackProps {
  fallbackSrc: string;
  alt: string;
  src: string;
  width: number;
  height: number;
  className?: string;
}

export default function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  ...rest
}: ImageWithFallbackProps) {
  const [imgSrc, set_imgSrc] = useState(src);

  useEffect(() => {
    set_imgSrc(src);
  }, [src]);

  return (
    <Image
      {...rest}
      alt={alt}
      src={imgSrc}
      onLoadingComplete={(result) => {
        if (result.naturalWidth === 0) {
          // Broken image
          set_imgSrc(fallbackSrc);
        }
      }}
      onError={() => {
        set_imgSrc(fallbackSrc);
      }}
      width={width}
      height={height}
    />
  );
}
