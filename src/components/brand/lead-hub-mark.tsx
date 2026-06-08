export function LeadHubMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="LeadHub">
      <rect width="40" height="40" rx="8" fill="#0f6bff" />
      <path d="M13 12v16M27 12v16M13 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="12" r="3" fill="white" />
      <circle cx="13" cy="28" r="3" fill="white" />
      <circle cx="27" cy="12" r="3" fill="white" />
      <circle cx="27" cy="28" r="3" fill="white" />
      <circle cx="20" cy="20" r="3" fill="white" />
    </svg>
  );
}
