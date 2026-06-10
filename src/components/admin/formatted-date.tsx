"use client";

import { useEffect, useState } from "react";

interface FormattedDateProps {
  dateString: string;
  className?: string;
}

export function FormattedDate({ dateString, className = "" }: FormattedDateProps) {
  const [formatted, setFormatted] = useState("—");

  useEffect(() => {
    if (!dateString) return;
    setFormatted(new Date(dateString).toLocaleString());
  }, [dateString]);

  return <span className={className}>{formatted}</span>;
}
