type MarcaProps = {
  tamanho?: number
}

export default function Marca({ tamanho = 36 }: MarcaProps) {
  return (
    <span className="marca" style={{ width: tamanho, height: tamanho }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={tamanho * 0.62} height={tamanho * 0.62} fill="none">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.2" stroke="#fff" strokeWidth="1.6" />
        <rect x="6.7" y="13.1" width="2.15" height="4.3" rx="0.3" fill="#fff" />
        <rect x="10.9" y="10.2" width="2.15" height="7.2" rx="0.3" fill="#fff" />
        <rect x="15.1" y="7.2" width="2.15" height="10.2" rx="0.3" fill="#fff" />
      </svg>
    </span>
  )
}
