export function computePriority({ severity = 'attention', dueAt = null, type = '', createdAt = null }, now = new Date()) {
  const reasons = [];
  let score = 0;
  if (severity === 'bloquant') { score += 100; reasons.push('cause bloquante'); }
  const due = dueAt ? new Date(dueAt) : null;
  if (due && !Number.isNaN(due.getTime())) {
    const hours = (due.getTime() - now.getTime()) / 3600000;
    if (hours < 0) { score += 80; reasons.push('échéance dépassée'); }
    else if (hours <= 24) { score += 45; reasons.push('échéance sous 24 h'); }
    else if (hours <= 72) { score += 20; reasons.push('échéance sous 72 h'); }
  }
  if (['traitement_defaut', 'rearmement'].includes(type)) { score += 20; reasons.push('impact opérationnel direct'); }
  if (createdAt) {
    const ageHours = (now.getTime() - new Date(createdAt).getTime()) / 3600000;
    if (ageHours >= 24) { score += 15; reasons.push('ancienneté supérieure à 24 h'); }
  }
  const level = score >= 100 ? 'critique' : score >= 45 ? 'haute' : score >= 20 ? 'normale' : 'planifiee';
  return { level, score, reasons };
}

