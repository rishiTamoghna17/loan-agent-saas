import { LEAD_SOURCES, LEAD_STATUSES, LOAN_PRODUCTS, STATUS_LABELS } from "@/lib/constants";

export function LeadFilters({ values }: { values: Record<string, string> }) {
  return (
    <form className="grid gap-3 border-b border-slate-200 bg-slate-50/60 p-4 md:grid-cols-4">
      <input name="q" defaultValue={values.q} placeholder="Search name or phone" className="field" />
      <select name="status" defaultValue={values.status} className="field">
        <option value="">All statuses</option>
        {LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
      </select>
      <select name="source" defaultValue={values.source} className="field">
        <option value="">All sources</option>
        {LEAD_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
      </select>
      <select name="loanType" defaultValue={values.loanType} className="field">
        <option value="">All loan types</option>
        {LOAN_PRODUCTS.map((loan) => <option key={loan} value={loan}>{loan}</option>)}
      </select>
      <select name="followUp" defaultValue={values.followUp} className="field">
        <option value="">All follow-ups</option>
        <option value="overdue">Overdue</option>
        <option value="today">Due today</option>
        <option value="upcoming">Upcoming</option>
        <option value="none">Not scheduled</option>
      </select>
      <input name="from" type="date" defaultValue={values.from} className="field" aria-label="Created from" />
      <input name="to" type="date" defaultValue={values.to} className="field" aria-label="Created to" />
      <select name="sort" defaultValue={values.sort || "created_desc"} className="field">
        <option value="created_desc">Newest first</option>
        <option value="created_asc">Oldest first</option>
        <option value="amount_desc">Highest amount</option>
        <option value="amount_asc">Lowest amount</option>
        <option value="name_asc">Name A-Z</option>
        <option value="status_asc">Status A-Z</option>
        <option value="follow_up_asc">Next follow-up</option>
      </select>
      <input type="hidden" name="pageSize" value={values.pageSize || "20"} />
      <div className="flex gap-2 md:col-span-4">
        <button className="btn-primary" type="submit">Apply filters</button>
        <a className="btn-secondary" href="/dashboard">Clear</a>
      </div>
    </form>
  );
}
