// ===================== SPACE WAR CO-OP PARTY SERVER (PartyKit) =====================
// This process only relays messages and tracks room membership + host election - it
// does not run any game simulation itself. All the actual co-op logic (shared enemies,
// loot, mission progress, remote player rendering) lives client-side in js/net.js and
// is wired into the game from js/game.js. One PartyKit "room" = one group of friends
// playing together, keyed by the room code they enter on the JOIN GAME screen.
export default class SpaceWarParty {
  constructor(room) {
    this.room = room;
    this.hostId = null;
    this.memberIds = new Set();
  }

  onConnect(connection) {
    const roster = [...this.memberIds];
    this.memberIds.add(connection.id);
    if (!this.hostId) this.hostId = connection.id;
    connection.send(JSON.stringify({ type: 'welcome', selfId: connection.id, hostId: this.hostId, roster }));
    this.room.broadcast(JSON.stringify({ type: 'playerJoined', id: connection.id }), [connection.id]);
  }

  onMessage(message, sender) {
    let msg;
    try { msg = JSON.parse(message); } catch (e) { return; }
    msg.from = sender.id;
    this.room.broadcast(JSON.stringify(msg), [sender.id]);
  }

  onClose(connection) {
    this.memberIds.delete(connection.id);
    this.room.broadcast(JSON.stringify({ type: 'playerLeft', id: connection.id }));
    if (connection.id === this.hostId) {
      this.hostId = this.memberIds.size > 0 ? [...this.memberIds][0] : null;
      if (this.hostId) this.room.broadcast(JSON.stringify({ type: 'hostChanged', hostId: this.hostId }));
    }
  }
}
