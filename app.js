const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const port = process.env.PORT;

const app = express();
app.set("view engine","views");
app.use(express.static(path.join(__dirname,"public")));

const server = http.createServer(app);

const io = socket(server);

const chess = new Chess();

let players = {};
let currentPlayer = "w";

app.get("/",(req,res)=>{
    res.render("index.ejs");
});

io.on("connection",function(socket) {
    console.log("Connected");

   // Initilized Player
    if(!players.white) {
        players.white = socket.id;
        socket.emit("PlayRole","w");
    }
    else if(!players.black) {
        players.black = socket.id;
        socket.emit("PlayRole","b");
    }
    else {
        socket.emit("Audience");
    }

    // Handle Disconnect Event
    socket.on("disconnect",function(socket) {

        if(socket.id === players.white) {
          delete players.white;
        }
        else if(socket.id === players.black) {
           delete players.black;
        }
    });

    //Check Valid Move
    socket.on("move",(move)=>{
        try {
            if(chess.turn() === "w" && socket.id != players.white) return;
            else if(chess.turn() === "b" && socket.id != players.black) return;

            let result = chess.move(move);
            
            if(result) {
                currentPlayer = chess.turn();
                io.emit("move",move);
                io.emit("boardState",chess.fen());
                
                if (chess.isGameOver()) {
                    if (chess.isCheckmate()) {
                        const winner = chess.turn() === 'w' ? 'Black' : 'White';
                        io.emit("gameOver", `${winner} wins by checkmate`);
                    } else if (chess.in_draw()) {
                        io.emit("gameOver", "Game is a draw");
                    }
                }
            }
            else {
                console.log("Invalid Error:",move);
                socket.emit("InvalidMove",move);
            }
        }
        catch(error) {
            console.log("Error:",error);
            socket.emit("Invalid",move);
        }
    })
});

server.listen(port,()=>{
    console.log(`Server is listing from port:${port}`);
});



