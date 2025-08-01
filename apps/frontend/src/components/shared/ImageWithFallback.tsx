import { useEffect, useState } from "react";
import Image from "next/image";

interface ImageWithFallbackProps {
  fallbackSrc: string;
  alt: string;
  src: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  priority?: boolean;
}

export default function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  fill,
  objectFit,
  priority,
  className,
  ...rest
}: ImageWithFallbackProps) {
  const [imgSrc, set_imgSrc] = useState(src);

  useEffect(() => {
    set_imgSrc(src);
  }, [src]);

  return (
    <Image
      priority={priority}
      {...rest}
      alt={alt}
      src={imgSrc}
      onLoad={(result) => {
        if (!result) {
          set_imgSrc(fallbackSrc);
        }
      }}
      onError={() => {
        set_imgSrc(fallbackSrc);
      }}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      objectFit={objectFit}
      className={className}
    />
  );
}
