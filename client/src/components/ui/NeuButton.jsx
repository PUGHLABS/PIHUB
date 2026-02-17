export default function NeuButton({ children, className = '', ...props }) {
  return (
    <button
      className={`neu-button px-6 py-3 font-medium text-[var(--neu-text)] ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
