export function PwaIcon({ size = 512 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 150 150" fill="none">
      <rect width="150" height="150" fill="#f7f7ef" />
      <g transform="translate(42 44) scale(1.8)" fill="none" stroke="#22312b" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 26V13a6 6 0 0 1 12 0v10a4 4 0 0 1-8 0v-6a4 4 0 0 1 8 0v6a4 4 0 0 0 8 0V13a6 6 0 0 0-12 0v13" />
        <circle cx="30" cy="27" r="2.5" fill="#22312b" stroke="none" />
      </g>
    </svg>
  );
}
