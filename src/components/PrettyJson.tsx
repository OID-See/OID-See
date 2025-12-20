
export function PrettyJson({ value }: { value: any }) {
  const text = (() => {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  })()

  return (
    <pre className="prettyjson" aria-label="JSON">
      <code>{text}</code>
    </pre>
  )
}
