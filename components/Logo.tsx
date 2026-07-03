import Image from "next/image";

export function Logo({ size = 120 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Hunters Paradise"
      width={size}
      height={size * 0.5}
      className="object-contain"
      priority
    />
  );
}
