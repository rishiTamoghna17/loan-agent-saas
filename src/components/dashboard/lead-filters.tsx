"use client";

import * as React from "react";
import { Search, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { LEAD_SOURCES, LEAD_STATUSES, LOAN_PRODUCTS, STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { FilterField } from "@/components/ui/filter-field";
import { ActiveFilterChip } from "@/components/ui/active-filter-chip";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface LeadFiltersProps {
  values: Record<string, string>;
}

export function LeadFilters({ values }: LeadFiltersProps) {
  const [showMoreFilters, setShowMoreFilters] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [fromDate, setFromDate] = React.useState(values.from || "");
  const [toDate, setToDate] = React.useState(values.to || "");

  const formRef = React.useRef<HTMLFormElement>(null);

  const activeFilters = React.useMemo(() => {
    const filters: { label: string; value: string; key: string }[] = [];
    if (values.q) filters.push({ label: "Search", value: values.q, key: "q" });
    if (values.status) filters.push({ label: "Status", value: STATUS_LABELS[values.status as keyof typeof STATUS_LABELS] || values.status, key: "status" });
    if (values.source) filters.push({ label: "Source", value: values.source, key: "source" });
    if (values.loanType) filters.push({ label: "Loan type", value: values.loanType, key: "loanType" });
    if (values.followUp) filters.push({ label: "Follow-up", value: values.followUp, key: "followUp" });
    if (values.from) filters.push({ label: "From", value: values.from, key: "from" });
    if (values.to) filters.push({ label: "To", value: values.to, key: "to" });
    return filters;
  }, [values]);

  const hasActiveFilters = activeFilters.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      formRef.current?.submit();
    } finally {
      setPending(false);
    }
  };

  const handleRemoveFilter = (key: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    if (key === "from") setFromDate("");
    if (key === "to") setToDate("");
    window.location.href = url.toString();
  };

  const handleClearAll = () => {
    const url = new URL(window.location.href);
    ["q", "status", "source", "loanType", "followUp", "from", "to", "page"].forEach(key => {
      url.searchParams.delete(key);
    });
    setFromDate("");
    setToDate("");
    window.location.href = url.toString();
  };

  return (
    <div className="space-y-3 p-4 sm:p-5">
      {/* Sort & View Toolbar - outside filter card */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select 
            name="sort" 
            defaultValue={values.sort || "created_desc"}
            placeholder="Sort by"
            className="w-auto"
          >
            <SelectItem value="created_desc">Newest first</SelectItem>
            <SelectItem value="created_asc">Oldest first</SelectItem>
            <SelectItem value="amount_desc">Highest amount</SelectItem>
            <SelectItem value="amount_asc">Lowest amount</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="status_asc">Status A-Z</SelectItem>
            <SelectItem value="follow_up_asc">Next follow-up</SelectItem>
          </Select>
          <Select 
            name="view" 
            defaultValue={values.view || "active"}
            placeholder="View"
            className="w-auto"
          >
            <SelectItem value="active">Active leads</SelectItem>
            <SelectItem value="archived">Archived leads</SelectItem>
            <SelectItem value="deleted">Deleted leads</SelectItem>
          </Select>
        </div>
        <Button 
          variant="ghost" 
          className="flex items-center gap-1.5 text-sm"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
        >
          <Filter className="h-4 w-4" />
          {showMoreFilters ? "Hide filters" : "More filters"}
          {showMoreFilters ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filter Card */}
      <form ref={formRef} action="" method="get" onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-visible">
        {/* Hidden inputs to preserve state */}
        <input type="hidden" name="pageSize" value={values.pageSize || "20"} />
        {values.folder ? <input type="hidden" name="folder" value={values.folder} /> : null}
        <input type="hidden" name="from" value={fromDate} />
        <input type="hidden" name="to" value={toDate} />

        {/* Responsive Grid - First Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search - Largest */}
          <div className="lg:col-span-2">
            <FilterField label="Search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={values.q}
                  placeholder="Search by name, phone"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
            </FilterField>
          </div>

          {/* Status */}
          <FilterField label="Status">
            <Select name="status" defaultValue={values.status} placeholder="All statuses">
              <SelectItem value="">All statuses</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</SelectItem>
              ))}
            </Select>
          </FilterField>

          {/* Source */}
          <FilterField label="Source">
            <Select name="source" defaultValue={values.source} placeholder="All sources">
              <SelectItem value="">All sources</SelectItem>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </Select>
          </FilterField>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Loan Type */}
          <FilterField label="Loan type">
            <Select name="loanType" defaultValue={values.loanType} placeholder="All loan types">
              <SelectItem value="">All loan types</SelectItem>
              {LOAN_PRODUCTS.map((loanType) => (
                <SelectItem key={loanType} value={loanType}>{loanType}</SelectItem>
              ))}
            </Select>
          </FilterField>

          {/* Combined Created Date Range */}
          <div className="lg:col-span-2">
            <FilterField label="Created date">
              <DateRangePicker from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
            </FilterField>
          </div>
        </div>

        {/* More Filters - Expandable Section */}
        {showMoreFilters && (
          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100">
            <FilterField label="Follow-up">
              <Select name="followUp" defaultValue={values.followUp} placeholder="All follow-ups">
                <SelectItem value="">All follow-ups</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="none">Not scheduled</SelectItem>
              </Select>
            </FilterField>
          </div>
        )}

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            {activeFilters.map((filter) => (
              <ActiveFilterChip
                key={filter.key}
                label={filter.label}
                value={filter.value}
                onRemove={() => handleRemoveFilter(filter.key)}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleClearAll}
              type="button"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" type="button" disabled={!hasActiveFilters} onClick={handleClearAll}>
            Reset
          </Button>
          <Button type="submit" disabled={pending} className="min-w-[120px]">
            {pending ? "Applying..." : "Apply filters"}
          </Button>
        </div>
      </form>
    </div>
  );
}
