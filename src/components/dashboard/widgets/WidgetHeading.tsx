interface WidgetHeadingProps {
  title: string
  tooltip?: string
}

export function WidgetHeading({ title }: WidgetHeadingProps) {
  return <h2 className="dashboard-subheading">{title}</h2>
}
