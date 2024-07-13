const socket = io();
const chess = new Chess();
const ChessBoard = document.querySelector(".chessboard");

const gameStartSound = document.getElementById('gameStart');
const selfMoveSound = document.getElementById('selfMove');
const checkmateSound = document.getElementById('checkmateSound');
const captureSound = document.getElementById('capture');
const illegalSound = document.getElementById('illegal');
const winSound = document.getElementById('winSound');
const loseSound = document.getElementById('loseSound');
const gameEndSound = document.getElementById('gameEnd');
const playComputerButton = document.getElementById("playComputerButton");
const googleFormButton = document.getElementById('googleFormButton');
const googleFormContainer = document.getElementById('googleFormContainer');



let draggedPeice = null;
let sourceSqure = null;
let PlayRole = null;

playComputerButton.addEventListener("click", () => {
    socket.emit("playComputer");
});

googleFormButton.addEventListener('click', () => {
    googleFormContainer.style.display = 'block';
    const googleForm = document.createElement('div');
    googleForm.src = 'https://docs.google.com/forms/d/e/1FAIpQLSexn_Ua95yP7U06qZ3UX3ARNUlzOlTHZWokxtqrv4f1TILeDw/viewform?usp=sf_link';
    googleFormContainer.appendChild(googleForm);
    window.open(googleForm.src, '_blank');
  });


const RenderBoard = () => {
    const board = chess.board();
    ChessBoard.innerHTML = "";
    
    board.forEach((row, rowIndex) => {
        row.forEach((square, columnIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "sqare",
                (rowIndex + columnIndex) % 2 === 0 ? "light" : "dark"
            );
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = columnIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = PieceUniCode(square);
                pieceElement.draggable = PlayRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: columnIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();

                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };

                    HandleMove(sourceSquare, targetSquare);
                }
            });

            ChessBoard.appendChild(squareElement);
        });
    });

    if (PlayRole === "b") {
        ChessBoard.classList.add("flipped");
    } else {
        ChessBoard.classList.remove("flipped");
    }
};

const HandleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    };

    if (chess.get(move.from).type === 'p' && (move.to[1] === '1' || move.to[1] === '8')) {
        ShowPromotionOptions(move);
    } else {
        socket.emit("move", move);
    }
};

const ShowPromotionOptions = (move) => {
    const promotionChoices = ['q', 'r', 'b', 'n'];
    const promotionOverlay = document.createElement('div');
    promotionOverlay.classList.add('promotion-overlay');

    promotionChoices.forEach(choice => {
        const button = document.createElement('button');
        button.innerText = choice.toUpperCase();
        button.onclick = () => {
            move.promotion = choice;
            socket.emit("move", move);
            document.body.removeChild(promotionOverlay);
        };
        promotionOverlay.appendChild(button);
    });

    document.body.appendChild(promotionOverlay);
};

// const PieceUniCode = (piece) => {
//     const unicodes = {
//         p: "/public/pieces/white/wp.png",
//         r: "/public/pieces/white/wr.png",
//         n: "/public/pieces/white/wn.png",
//         b: "/public/pieces/white/wb.png",
//         q: "/public/pieces/white/wq.png",
//         k: "/public/pieces/white/wk.png",
//         P: "/public/pieces/black/bp.png",
//         R: "/public/pieces/black/br.png",
//         N: "/public/pieces/black/bn.png",
//         B: "/public/pieces/black/bb.png",
//         Q: "/public/pieces/black/bq.png",
//         K: "/public/pieces/black/bk.png",
//     };
//     return unicodes[piece.type] || "";
// };

const PieceUniCode = (piece) => {
    const unicodes = {
        p: "♙",
        r: "♖",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♟",
        R: "♜",
        N: "♞",
        B: "♝",
        Q: "♛",
        K: "♚",
    };
    return unicodes[piece.type] || "";
};

socket.on("PlayRole", (role) => {
    PlayRole = role;
    RenderBoard();
    gameStartSound.play();
});

socket.on("Audience", () => {
    PlayRole = null;
    RenderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    RenderBoard();
});

socket.on("move", (move) => {
    chess.move(move);
    RenderBoard();
    selfMoveSound.play();
});

socket.on("InvalidMove", (move) => {
    alert(`Invalid move: ${move.from} to ${move.to}`);
    illegalSound.play();
});

socket.on("gameOver", (message) => {
    alert(message);

    if (message.includes("checkmate")) {
        checkmateSound.play(); 
    } else if (message.includes("win")) {
        winSound.play(); 
    } else if (message.includes("lose")) {
        loseSound.play(); 
    } 
    else {
        gameEndSound.play(); 
    }
});
