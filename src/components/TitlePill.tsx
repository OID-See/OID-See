
export function TitlePill({ left, right }: { left: string; right: string }) {
  return (
    <div className="titlepill">
      <span className="titlepill__left">{left}</span>
      {right ? <span className="titlepill__right">{right}</span> : null}
    </div>
  )
}
