import { findZone } from '../data/reference.js';

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function groupActionsByZone(actions) {
  const groups = new Map();
  for (const action of actions.filter((item) => !['done', 'cancelled'].includes(item.status))) {
    const zoneId = action.stage === 'remise_en_place' && action.finalZoneId ? action.finalZoneId : action.targetZoneId || 'reserve-smur';
    if (!groups.has(zoneId)) groups.set(zoneId, []);
    groups.get(zoneId).push(action);
  }
  return groups;
}

export function planRoute(actions, originZoneId = 'pc-ide') {
  const openActions = actions.filter((item) => !['done', 'cancelled'].includes(item.status));
  const primaryGroups = groupActionsByZone(openActions);
  const finalGroups = new Map();
  for (const action of openActions) {
    if (!action.finalZoneId || action.finalZoneId === action.targetZoneId || action.stage === 'remise_en_place') continue;
    if (!finalGroups.has(action.finalZoneId)) finalGroups.set(action.finalZoneId, []);
    finalGroups.get(action.finalZoneId).push(action);
  }
  const result = [];
  let current = findZone(originZoneId) || [...primaryGroups.keys(), ...finalGroups.keys()].map(findZone).find(Boolean);

  const appendNearest = (groups, role) => {
    const remaining = [...groups.keys()].map(findZone).filter(Boolean);
    while (remaining.length) {
      remaining.sort((a, b) => distance(current, a) - distance(current, b));
      const next = remaining.shift();
      const previous = result.at(-1);
      if (previous?.zone.id === next.id) previous.actions = [...new Map([...previous.actions, ...(groups.get(next.id) || [])].map((action) => [action.id, action])).values()];
      else result.push({ zone: next, actions: groups.get(next.id) || [], role });
      current = next;
    }
  };
  appendNearest(primaryGroups, 'action');
  appendNearest(finalGroups, 'destination_finale');
  return result;
}
