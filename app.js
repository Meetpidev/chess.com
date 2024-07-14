const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");
const sharedsession = require("express-socket.io-session");

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);



const chess = new Chess();

let players = {};
let currentPlayer = "w";
let isComputerOpponent = false;

const sessionMiddleware = session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 3600000 
    }
});

 app.use(sessionMiddleware);

  const io = socket(server);
  io.use(sharedsession(sessionMiddleware, { autoSave: true }));

app.get("/", (req, res) => {

    if (!req.session.playRole) {
        req.session.playRole = "white"; 
    } else if (req.session.playRole !== "black") {
        req.session.playRole = "black"; 
    } else {
        console.log("All Things Are Defined");
    }
    res.render("index.ejs", { playerRole: req.session.playRole });

});

io.on("connection", function(socket) {
    console.log("Connected");

    const session = socket.handshake.session;
    console.log("Session:", session); 
    if (session && session.playRole) {
        const playRole = session.playRole;
        console.log("PlayRole:",playRole);
    } else {
        console.log("Session or playRole is not defined");
    }
  
    


    // Initialize Player
    if (!players.white) {
        players.white = socket.id;
        socket.emit("PlayRole", "w");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("PlayRole", "b");
    } else {
        socket.emit("Audience");
    }

    // Handle Disconnect Event
    socket.on("disconnect", function() {
        if (socket.id === players.white) {
            delete players.white;
            if (players.black) {
                isComputerOpponent = true;
                io.to(players.black).emit("gameOver", "Opponent left, switching to computer opponent");
                currentPlayer = "b";
                playComputerMove();
            } else {
                resetGame();
            }
        } else if (socket.id === players.black) {
            delete players.black;
            if (players.white) {
                isComputerOpponent = true;
                io.to(players.white).emit("gameOver", "Opponent left, switching to computer opponent");
                currentPlayer = "w";
                playComputerMove();
            } else {
                resetGame();
            }
        }
    });

    // Check Valid Move
    socket.on("move", (move) => {
        try {
            if (chess.turn() === "w" && socket.id !== players.white) return;
            else if (chess.turn() === "b" && socket.id !== players.black) return;

            let result = chess.move(move);

            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());

                if (chess.isGameOver()) {
                    if (chess.isCheckmate()) {
                        const winner = chess.turn() === "w" ? "Black" : "White";
                        io.emit("gameOver", `${winner} wins by checkmate`);
                    } else if (chess.in_draw()) {
                        io.emit("gameOver", "Game is a draw");
                    }
                } else if (isComputerOpponent && chess.turn() === currentPlayer) {
                    setTimeout(playComputerMove, 1000); // Give a small delay before the computer makes its move
                }
            } else {
                console.log("Invalid Error:", move);
                socket.emit("InvalidMove", move);
            }
        } catch (error) {
            console.log("Error:", error);
            socket.emit("Invalid", move);
        }
    });

    socket.on("playComputer", () => {
        isComputerOpponent = true;
        if (!players.white) {
            players.white = socket.id;
            currentPlayer = "w";
            socket.emit("PlayRole", "w");
        } else if (!players.black) {
            players.black = socket.id;
            currentPlayer = "b";
            socket.emit("PlayRole", "b");
        }
        playComputerMove();
    });

    const resetGame = () => {
        chess.reset();
        players = {};
        currentPlayer = "w";
        isComputerOpponent = false;
        io.emit("gameOver", "Game has been reset due to player disconnection");
        io.emit("boardState", chess.fen());
    };

    const playComputerMove = () => {
        if (chess.isGameOver()) return;

        const moves = chess.moves();
        const move = moves[Math.floor(Math.random() * moves.length)]; // Simple random move
        chess.move(move);
        io.emit("move", move);
        io.emit("boardState", chess.fen());

        if (chess.isGameOver()) {
            if (chess.isCheckmate()) {
                const winner = chess.turn() === "w" ? "Black" : "White";
                io.emit("gameOver", `${winner} wins by checkmate`);
            } else if (chess.in_draw()) {
                io.emit("gameOver", "Game is a draw");
            }
        }
    };
});

server.listen(port, () => {
    console.log(`Server is listening on port:${port}`);
});
