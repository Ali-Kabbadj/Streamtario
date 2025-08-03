"use client";

import {
  useEffect,
  useState,
  type ComponentProps,
  type SyntheticEvent,
} from "react";
import Image from "next/image";

type NextImageProps = Omit<
  ComponentProps<typeof Image>,
  "src" | "onError" | "onLoad"
>;

interface ImageWithFallbackProps extends NextImageProps {
  fallbackSrc: string;
  src: string | null | undefined;
}

export default function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  className,
  ...rest
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <Image
      {...rest}
      alt={alt}
      className={className}
      src={imgSrc ?? fallbackSrc}
      onLoad={(result: SyntheticEvent<HTMLImageElement, Event>) => {
        const target = result.target as HTMLImageElement;
        if (target.naturalWidth === 0) {
          setImgSrc(fallbackSrc);
        }
      }}
      onError={() => {
        setImgSrc(fallbackSrc);
      }}
    />
  );
}
