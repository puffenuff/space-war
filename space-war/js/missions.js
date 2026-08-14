
function ensurePlanetMissions(planetId) {
  const pState = state.planets[planetId];
  MISSIONS[planetId].forEach((m) => {
    if (!pState.missions[m.id]) pState.missions[m.id] = { done: false, progress: 0 };
  });
}

function activeMissions(planetId) {
  ensurePlanetMissions(planetId);
  return MISSIONS[planetId].map((def) => ({ def, prog: state.planets[planetId].missions[def.id] }));
}

function rewardText(reward) {
  const parts = [];
  if (reward.coins) parts.push(`+${reward.coins} coins`);
  if (reward.tools) parts.push(`+${reward.tools} tools`);
  if (reward.rocketPart) parts.push(`${labelForPart(reward.rocketPart)}!`);
  return parts.join('  ');
}

function labelForPart(part) {
  return {
    engine: 'Engine', fuelTank: 'Fuel Tank', noseCone: 'Nose Cone', fins: 'Fins',
    heatShield: 'Heat Shield', guidanceCore: 'Guidance Core',
  }[part] || part;
}

function applyReward(reward) {
  if (reward.coins) state.coins += reward.coins;
  if (reward.tools) state.inventory.tools += reward.tools;
  if (reward.rocketPart) state.rocketParts[reward.rocketPart] = true;
}

function completeMission(planetId, missionId, toast) {
  ensurePlanetMissions(planetId);
  const prog = state.planets[planetId].missions[missionId];
  if (prog.done) return null;
  const def = MISSIONS[planetId].find((m) => m.id === missionId);
  prog.done = true;
  applyReward(def.reward);
  let text = `Mission Complete: ${def.name}  ${rewardText(def.reward)}`;
  if (allMissionsDone(planetId) && !state.rocketParts.heatShield) {
    state.rocketParts.heatShield = true;
    text += `  |  All missions done: Heat Shield acquired!`;
  }
  if (toast) toast(text);
  return def;
}

function progressKill(planetId, toast) {
  ensurePlanetMissions(planetId);
  state.planets[planetId].kills += 1;
  MISSIONS[planetId].filter((m) => m.type === 'kill').forEach((def) => {
    const prog = state.planets[planetId].missions[def.id];
    if (prog.done) return;
    prog.progress = state.planets[planetId].kills;
    if (prog.progress >= def.target) completeMission(planetId, def.id, toast);
  });
}

function progressCollect(planetId, toast) {
  ensurePlanetMissions(planetId);
  MISSIONS[planetId].filter((m) => m.type === 'collect').forEach((def) => {
    const prog = state.planets[planetId].missions[def.id];
    if (prog.done) return;
    prog.progress = (prog.progress || 0) + 1;
    if (prog.progress >= def.target) completeMission(planetId, def.id, toast);
  });
}

function completeMissionByType(planetId, type, toast) {
  ensurePlanetMissions(planetId);
  const def = MISSIONS[planetId].find((m) => m.type === type);
  if (!def) return null;
  return completeMission(planetId, def.id, toast);
}

// atmosphere missions need two things done before they complete: the blueprint microchip
// found in that planet's crashed shuttle, and enough of each of its two required named
// materials banked (which gets spent on completion) - call this whenever either one changes
function checkAtmosphereMission(planetId, toast) {
  ensurePlanetMissions(planetId);
  const def = MISSIONS[planetId].find((m) => m.type === 'atmosphere');
  if (!def) return;
  const prog = state.planets[planetId].missions[def.id];
  if (prog.done) return;
  if (!state.planets[planetId].blueprintFound) return;
  const haveAll = Object.entries(def.materialTargets).every(([key, amount]) => state.inventory.materials[key] >= amount);
  if (!haveAll) return;
  Object.entries(def.materialTargets).forEach(([key, amount]) => { state.inventory.materials[key] -= amount; });
  completeMission(planetId, def.id, toast);
}

function missionProgressLabel(planetId, def) {
  const prog = state.planets[planetId].missions[def.id];
  if (prog.done) return 'Done';
  if (def.type === 'kill' || def.type === 'collect') return `${prog.progress || 0}/${def.target}`;
  if (def.type === 'atmosphere') {
    const chipStatus = state.planets[planetId].blueprintFound ? 'chip found' : 'chip missing';
    const matStatus = Object.entries(def.materialTargets)
      .map(([key, amount]) => `${Math.min(state.inventory.materials[key], amount)}/${amount} ${MATERIAL_BY_KEY[key].name}`)
      .join(', ');
    return `${matStatus}, ${chipStatus}`;
  }
  return 'In progress';
}

function allMissionsDone(planetId) {
  ensurePlanetMissions(planetId);
  return MISSIONS[planetId].every((m) => state.planets[planetId].missions[m.id].done);
}
