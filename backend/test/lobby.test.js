const assert = require("node:assert/strict");
const test = require("node:test");

const { attachLobbyHandlers, MAX_PLAYERS, MIN_PLAYERS } = require("../lobby");

class FakeSocket {
  constructor(io, id) {
    this.io = io;
    this.id = id;
    this.handlers = new Map();
    this.events = [];
  }

  on(eventName, handler) {
    this.handlers.set(eventName, handler);
  }

  emit(eventName, payload) {
    this.events.push({ eventName, payload });
  }

  join(roomCode) {
    if (!this.io.rooms.has(roomCode)) {
      this.io.rooms.set(roomCode, new Set());
    }
    this.io.rooms.get(roomCode).add(this.id);
  }

  clientEmit(eventName, payload) {
    this.handlers.get(eventName)?.(payload);
  }

  eventsFor(eventName) {
    return this.events.filter((event) => event.eventName === eventName);
  }
}

class FakeIo {
  constructor() {
    this.handlers = new Map();
    this.sockets = new Map();
    this.rooms = new Map();
    this.emissions = [];
  }

  on(eventName, handler) {
    this.handlers.set(eventName, handler);
  }

  connect(id) {
    const socket = new FakeSocket(this, id);
    this.sockets.set(id, socket);
    this.handlers.get("connection")(socket);
    return socket;
  }

  to(target) {
    return {
      emit: (eventName, payload) => {
        this.emissions.push({ target, eventName, payload });
        const recipients = this.sockets.has(target)
          ? [this.sockets.get(target)]
          : [...(this.rooms.get(target) || [])].map((id) =>
              this.sockets.get(id),
            );
        recipients.forEach((socket) => socket.emit(eventName, payload));
      },
    };
  }
}

const createLobby = () => {
  const io = new FakeIo();
  const rooms = new Map();
  attachLobbyHandlers(io, rooms);

  const host = io.connect("player-1");
  host.clientEmit("create_room");
  const { roomCode } = host.eventsFor("room_created")[0].payload;

  return { io, rooms, roomCode, host, players: [host] };
};

const addPlayers = (lobby, count) => {
  while (lobby.players.length < count) {
    const socket = lobby.io.connect(`player-${lobby.players.length + 1}`);
    socket.clientEmit("join_room", { roomCode: lobby.roomCode });
    lobby.players.push(socket);
  }
};

const setSchoolStage = (socket, roomCode, schoolStage) => {
  socket.clientEmit("set_school_stage", { roomCode, schoolStage });
};

const startGame = (socket, roomCode) => {
  socket.clientEmit("start_game", { roomCode });
};

test("supports a 4-player minimum, with no automatic start at four", () => {
  assert.equal(MIN_PLAYERS, 4);
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  addPlayers(lobby, 3);

  startGame(lobby.host, lobby.roomCode);
  assert.equal(lobby.host.eventsFor("room_error").length, 1);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  addPlayers(lobby, 4);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  startGame(lobby.host, lobby.roomCode);
  const startedEvents = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "game_started",
  );
  assert.equal(startedEvents.length, 4);
  assert.equal(
    new Set(startedEvents.map(({ payload }) => payload.condition)).size,
    4,
  );
});

test("allows eight players and rejects a ninth player", () => {
  assert.equal(MAX_PLAYERS, 8);
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Médio");
  addPlayers(lobby, 8);

  const ninthPlayer = lobby.io.connect("player-9");
  ninthPlayer.clientEmit("join_room", { roomCode: lobby.roomCode });
  assert.equal(lobby.rooms.get(lobby.roomCode).players.length, 8);
  assert.equal(ninthPlayer.eventsFor("room_joined").length, 0);
  assert.match(ninthPlayer.eventsFor("room_error")[0].payload.message, /8\/8/);

  startGame(lobby.host, lobby.roomCode);
  const roles = lobby.players.map(
    (player) => player.eventsFor("game_started")[0].payload.condition,
  );
  const requiredRoles = new Set(["cadeirante", "cego", "surdo", "neuroatipico"]);
  assert.deepEqual(new Set(roles.slice(0, 4)), requiredRoles);
  assert.ok(roles.every((role) => requiredRoles.has(role)));
});

test("rejects a start request when a room has more than eight players", () => {
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Superior");
  addPlayers(lobby, 8);
  const ninthPlayer = lobby.io.connect("player-9");
  lobby.rooms.get(lobby.roomCode).players.push(ninthPlayer.id);

  startGame(lobby.host, lobby.roomCode);
  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /4 a 8/);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);
});

test("only the host can start the game", () => {
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  addPlayers(lobby, 4);

  startGame(lobby.players[1], lobby.roomCode);
  assert.match(
    lobby.players[1].eventsFor("room_error")[0].payload.message,
    /anfitrião/,
  );
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  startGame(lobby.host, lobby.roomCode);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 4);
});

test("rejects duplicate starts and sends only each player's private role", () => {
  const lobby = createLobby();
  setSchoolStage(lobby.host, lobby.roomCode, "Médio");
  addPlayers(lobby, 4);

  startGame(lobby.host, lobby.roomCode);
  const firstStartEvents = lobby.io.emissions.filter(
    ({ eventName }) => eventName === "game_started",
  );
  startGame(lobby.host, lobby.roomCode);

  assert.equal(
    lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length,
    firstStartEvents.length,
  );
  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /iniciada/);
  assert.deepEqual(
    firstStartEvents.map(({ target }) => target).sort(),
    lobby.players.map(({ id }) => id).sort(),
  );
  for (const player of lobby.players) {
    const [event] = player.eventsFor("game_started");
    assert.deepEqual(Object.keys(event.payload), ["condition"]);
  }
});

test("preserves room_joined and transfers host when the host disconnects", () => {
  const lobby = createLobby();
  addPlayers(lobby, 2);
  assert.deepEqual(lobby.players[1].eventsFor("room_joined")[0].payload, {
    roomCode: lobby.roomCode,
    playerCount: 2,
    hostId: lobby.host.id,
    schoolStage: null,
    started: false,
  });

  lobby.host.clientEmit("disconnect");
  const room = lobby.rooms.get(lobby.roomCode);
  assert.equal(room.hostId, lobby.players[1].id);
  assert.equal(room.players.length, 1);
});

test("rejects an invalid school stage", () => {
  const lobby = createLobby();

  setSchoolStage(lobby.host, lobby.roomCode, "Pós-graduação");

  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /inválida/);
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, null);
});

test("only the host can choose the school stage", () => {
  const lobby = createLobby();
  addPlayers(lobby, 2);

  setSchoolStage(lobby.players[1], lobby.roomCode, "Fundamental");

  assert.match(lobby.players[1].eventsFor("room_error")[0].payload.message, /anfitrião/);
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, null);
});

test("rejects starting without a school stage", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);

  startGame(lobby.host, lobby.roomCode);

  assert.match(lobby.host.eventsFor("room_error")[0].payload.message, /etapa escolar/);
  assert.equal(lobby.rooms.get(lobby.roomCode).started, false);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);
});

test("a valid school stage is shared and the host can start manually", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);

  setSchoolStage(lobby.host, lobby.roomCode, "Superior");
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, "Superior");
  assert.ok(
    lobby.players.every((player) =>
      player.eventsFor("room_updated").some(({ payload }) => payload.schoolStage === "Superior"),
    ),
  );
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 0);

  startGame(lobby.host, lobby.roomCode);

  assert.equal(lobby.rooms.get(lobby.roomCode).started, true);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 4);
});

test("rejects changing the school stage after the game starts", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);
  setSchoolStage(lobby.host, lobby.roomCode, "Médio");
  startGame(lobby.host, lobby.roomCode);

  setSchoolStage(lobby.host, lobby.roomCode, "Superior");

  assert.match(lobby.host.eventsFor("room_error").at(-1).payload.message, /após o início/);
  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, "Médio");
});

test("the transferred host can choose the stage and continue before the game starts", () => {
  const lobby = createLobby();
  addPlayers(lobby, 4);
  setSchoolStage(lobby.host, lobby.roomCode, "Fundamental");
  lobby.host.clientEmit("disconnect");

  const newHost = lobby.players[1];
  assert.equal(lobby.rooms.get(lobby.roomCode).hostId, newHost.id);
  setSchoolStage(newHost, lobby.roomCode, "Superior");
  addPlayers(lobby, 5);
  startGame(newHost, lobby.roomCode);

  assert.equal(lobby.rooms.get(lobby.roomCode).schoolStage, "Superior");
  assert.equal(lobby.rooms.get(lobby.roomCode).started, true);
  assert.equal(lobby.io.emissions.filter(({ eventName }) => eventName === "game_started").length, 4);
});
