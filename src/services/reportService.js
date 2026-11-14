import { apiRequest } from './api'

export const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'OTHER', label: 'Other' },
]

export async function submitReport({ targetType, targetId, reason, description }) {
  const payload = { targetType, targetId, reason }
  if (typeof description === 'string' && description.trim()) payload.description = description.trim()
  const result = await apiRequest('/reports', { method: 'POST', body: payload })
  return result.report || result
}
