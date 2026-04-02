interface WidgetHeadingProps {
  title: string
  tooltip: string
}

export function WidgetHeading({ title, tooltip }: WidgetHeadingProps) {
  return (
    <span className="widget-tooltip-wrap">
      <h2 className="dashboard-subheading">{title}</h2>
      <span className="widget-tooltip-icon" aria-label="Info">?</span>
      <span className="widget-tooltip-bubble">{tooltip}</span>
    </span>
  )
}
