import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function CustomerPageHero({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-6 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E8C77A]">
              Customer Module
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function CustomerSectionCard({
  title,
  icon: Icon,
  children,
  actions,
  subtitle,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
              <Icon size={16} />
            </div>
          ) : null}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CustomerStatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  const tones = {
    neutral: "bg-slate-50 text-slate-700",
    accent: "bg-[#B8873A]/10 text-[#B8873A]",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon size={16} />
          </div>
        ) : null}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CustomerEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function CustomerBreadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content = (
          <span
            className={`font-medium ${
              isLast ? "text-slate-600" : "text-slate-400 transition-colors hover:text-slate-600"
            }`}
          >
            {item.label}
          </span>
        );

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span className="text-slate-300">/</span>}
            {item.href && !isLast ? <Link href={item.href}>{content}</Link> : content}
          </div>
        );
      })}
    </nav>
  );
}

export function CustomerToolbar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between">
      {children}
    </div>
  );
}

export function CustomerTableFrame({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3">{footer}</div>}
    </div>
  );
}
