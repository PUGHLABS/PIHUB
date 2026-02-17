export default function NeuInput({ className = '', ...props }) {
  return (
    <input
      className={`neu-inset px-4 py-3 bg-transparent outline-none text-[var(--neu-text)] placeholder:text-[var(--neu-text-muted)] w-full ${className}`}
      {...props}
    />
  )
}
