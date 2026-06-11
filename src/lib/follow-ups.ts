export type FollowUpStatus = "pending" | "completed" | "cancelled";

export function getLocalDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    localDate: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour)
  };
}

export function classifyFollowUp(dueAt: string, timezone: string, now = new Date()) {
  const dueDate = getLocalDateParts(new Date(dueAt), timezone).localDate;
  const today = getLocalDateParts(now, timezone).localDate;
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

export function formatFollowUpDate(dueAt: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dueAt));
}

export function zonedDateTimeToUtc(value: string, timezone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return "";
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let guess = desired;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
    guess += desired - represented;
  }
  return new Date(guess).toISOString();
}
