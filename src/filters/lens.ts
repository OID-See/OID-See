export type Lens = 'full' | 'risk' | 'structure'

export function lensEdgeAllowed(lens: Lens | string, edgeType: string): boolean {
  if (lens === 'full') return true

  if (lens === 'risk') {
    const allow = new Set([
      'HAS_SCOPE',
      'HAS_SCOPES',
      'HAS_TOO_MANY_SCOPES',
      'HAS_PRIVILEGED_SCOPES',
      'HAS_OFFLINE_ACCESS',
      'HAS_ROLE',
      'HAS_APP_ROLE',
      'CAN_IMPERSONATE',
      'EFFECTIVE_IMPERSONATION_PATH',
      'PERSISTENCE_PATH',
      'ASSIGNED_TO',
    ])
    return allow.has(edgeType)
  }

  // structure lens
  const allow = new Set(['INSTANCE_OF', 'MEMBER_OF', 'OWNS', 'GOVERNS', 'ASSIGNED_TO'])
  return allow.has(edgeType)
}
