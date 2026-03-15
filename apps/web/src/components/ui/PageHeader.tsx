interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function PageHeader({ title, description, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && (
            <div className="mt-1 text-sm text-slate-500 max-w-2xl space-y-0.5">{description}</div>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
