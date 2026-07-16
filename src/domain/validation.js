const ROLES = new Set(['soignant', 'referent', 'pharmacie', 'biomedical', 'administrateur']);

export function validateEvent(event) {
  const errors = [];
  if (!event?.id) errors.push('id requis');
  if (!event?.type) errors.push('type requis');
  if (!event?.at || Number.isNaN(new Date(event.at).getTime())) errors.push('date invalide');
  if (!event?.userId) errors.push('utilisateur requis');
  return { valid: errors.length === 0, errors };
}

export function can(role, capability) {
  const normalized = ROLES.has(role) ? role : 'soignant';
  const matrix = {
    soignant: new Set(['read', 'declare', 'audit', 'complete_action']),
    referent: new Set(['read', 'declare', 'audit', 'complete_action', 'manage_reference', 'view_reports']),
    pharmacie: new Set(['read', 'complete_action', 'manage_lots', 'view_reports']),
    biomedical: new Set(['read', 'complete_action', 'manage_defects', 'view_reports']),
    administrateur: new Set(['read', 'declare', 'audit', 'complete_action', 'manage_reference', 'manage_lots', 'manage_defects', 'view_reports', 'manage_users'])
  };
  return matrix[normalized].has(capability);
}

