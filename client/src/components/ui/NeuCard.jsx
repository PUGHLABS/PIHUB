export default function NeuCard({ children, className = '', inset = false }) {
  return (
    <div className={`${inset ? 'neu-inset' : 'neu-flat'} p-6 ${className}`}>
      {children}
    </div>
  )
}
