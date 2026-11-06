import type { SVGProps } from "react";
export function RivetMark({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M9 7h8a7 7 0 0 1 3.5 13.06L25 26h-6l-5-7h-1v7H9V7Zm4 4v4h4a2 2 0 1 0 0-4h-4Z"
      />
    </svg>
  );
}
