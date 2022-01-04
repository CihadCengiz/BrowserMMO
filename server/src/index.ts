import express, { Application } from "express";
import { Server } from "socket.io";
import { createServer } from "http";

const app: Application = express();
const httpServer = createServer(app);
const port = 3001;

app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.use("/index.html", express.static(__dirname + "/index.html"));


const io = new Server(httpServer, { serveClient: true });

const SOCKET_LIST: { [key: string]: any } = {};

// interface Player { /////// ???????????????????????????? aq
//   list: object;
// }

const Entity = () => {
  const self: any = {
    x: 250,
    y: 250,
    speedX: 0,
    speedY: 0,
    id: null,
  };

  self.update = () => {
    self.updatePosition();
  };
  self.updatePosition = () => {
    self.x += self.speedX;
    self.y += self.speedY;
  };
  return self;
};

const Player = (id: string) => {
  const self = Entity();
    self.x = 250;
    self.y = 250;
    self.id = id;
    self.name = String(Math.floor(Math.random() * 10));
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpeed = 10;
  
  const super_update = self.update;
  self.update = () => {
    self.updateSpeed();
    super_update();
  };

  self.updateSpeed = () => {
    if(self.pressingRight)
      self.speedX = self.maxSpeed;
    else if(self.pressingLeft)
      self.speedX = -self.maxSpeed;
    else self.speedX = 0;

    if(self.pressingUp)
      self.speedY = self.maxSpeed;
    else if(self.pressingDown)
      self.speedY = -self.maxSpeed;
    else self.speedY = 0;
  };

  Player.list[id] = self;
  return self;
};

Player.list = {};
Player.onConnect = (socket: any) => {
  const player = Player(socket.id);
  socket.on("keyPress", (data: any) => {
    if(data.inputId === "left")
      player.pressingLeft = data.state;
    if(data.inputId === "right")
      player.pressingRight = data.state;
    if(data.inputId === "up")
      player.pressingUp = data.state;
    if(data.inputId === "down")
      player.pressingDown = data.state;
  });
};

Player.onDisconnect = (socket: any) => {
  delete Player.list[socket.id];
};

Player.update = () => {
  const pack = [];
  for (const i in Player.list) {
    const player = Player.list[i];
    player.update();
    pack.push({
      x: player.x,
      y: player.y,
      name: player.name,
    });
  }
  return pack;
};

const Bullet = (angle: any) => {
  const self = Entity();
  self.id = Math.random();
  self.speedX = Math.cos(angle/180*Math.PI) * 10;
  self.speedY = Math.cos(angle/180*Math.PI) * 10;

  self.timer = 0;
  self.toRemove = false;
  const super_update = self.update;
  self.update = () => {
    if(self.timer++ > 100)
      self.toRemove = true;
    super_update();
  };
  Bullet.list[self.id] = self;
  return self;
};

Bullet.list = {};

Bullet.update = () => {
  if(Math.random() < 0.1)
    Bullet(Math.random()*360);

  const pack = [];
  for (const i in Bullet.list) {
    const bullet = Bullet.list[i];
    bullet.update();
    pack.push({
      x: bullet.x,
      y: bullet.y
    });
  }
  return pack;
};

io.on("connection", (socket) => {
  SOCKET_LIST[socket.id] = socket;

  Player.onConnect(socket);

  console.log("socket connected id:" + socket.id);

  socket.on("disconnect", () => {
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });

  
});

setInterval(() => {
  const pack = {
    player: Player.update(),
    bullet: Bullet.update()
  };
  
  for (const i in SOCKET_LIST) {
    const socket = SOCKET_LIST[i];
    socket.emit("newPositions", pack);
  }
}, 1000 / 25);

try {
  httpServer.listen(port, () => {
    console.log(`Running on port ${port}.`);
  });
} catch (error) {
  if (error instanceof Error) console.log(`Error occured: ${error.message}`);
}
