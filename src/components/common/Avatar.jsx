export default function Avatar({ initials = 'WW', size = '' }) {
  return <span className={`avatar ${size ? `avatar-${size}` : ''}`}>{initials}</span>
}
