const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
// const SSL_KEY = "cert/server.key";
// const SSL_CERT = "cert/server.crt";
// const https = require("https");
const http = require("http");
// const options = {
//   key: fs.readFileSync(SSL_KEY).toString(),
//   cert: fs.readFileSync(SSL_CERT).toString()
// };
const PORT = process.env.PORT || 443;

// const server = https.createServer(options, app);
const server = http.createServer(app);
const io = require("socket.io")(server);
server.listen(PORT, () => {
  console.log(`SERVER START PORT: ${server.address().port}`);
});

// app.get("/", (req, res, next) => {
//   console.dir(req);
//   res.end()
// });

// ミドルウェア設定
app.use(express.urlencoded({ extended: true }));

// multer
// 保存フォルダ作成
// const data_path = "data";
const data_path = "tmp";
fs.mkdirSync(data_path, { recursive: true });

const storage_data = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, data_path);
  },
  filename: function(req, file, cb) {
    cb(null, decodeURI(file.originalname));
  }
});
const upload_data = multer({ storage: storage_data });
app.post("/store", upload_data.single("data"), function(req, res, next) {
  console.log(req.file);
  console.log("STORE: FILE UPLOAD Complete");
  res.send("STORE: FILE UPLOAD Complete");
});


app.use(express.static("dist"));
// app.use(express.static("data"));
app.use("/tmp", express.static("tmp"));
app.get("/Holo", (req, res) => {
  res.sendFile(__dirname + "/dist/index.html");
});

// -------------------------------------------------------------
// socket.io
const users = {};

io.on("connection", socket => {
  socket.emit("connected", "HELLO");

  socket.on("disconnect", reason => {
    delete users[socket.id];
    console.log(`${reason}: ${socket.id}  -- users = ${JSON.stringify(users)}`);
  })

  socket.on("regist", (msg) => {
    users[socket.id] = msg; // users[] = { name: name, role: role }
    console.log(users);
    if ( Object.keys(users).length >= 2 ) {
      setTimeout(() => {
        io.emit("regist", users);
      }, 1000);
    }
  })
  socket.on("message", msg => {
    console.log(msg);
  });
  socket.on("publish", msg => {
    // console.log(msg);
    socket.broadcast.emit("publish", msg);
  });
  socket.on("update", msg => {
    console.log(decodeURI(msg.file_name));
    socket.broadcast.emit("update", msg);
  })
})
