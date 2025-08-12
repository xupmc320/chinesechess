const canvas = document.getElementById('chessCanvas');
const ctx = canvas.getContext('2d');
const turnIndicator = document.getElementById('turn-indicator');
const restartButton = document.getElementById('restart-button');

// --- 遊戲設定 ---
const GRID_SIZE = 60;
const BOARD_COLS = 9;
const BOARD_ROWS = 10;
const PIECE_RADIUS = GRID_SIZE / 2 - 4;

const PIECES = {
    'r_k': { name: '帥', color: 'red' }, 'r_a': { name: '仕', color: 'red' },
    'r_e': { name: '相', color: 'red' }, 'r_h': { name: '傌', color: 'red' },
    'r_r': { name: '俥', color: 'red' }, 'r_c': { name: '炮', color: 'red' },
    'r_p': { name: '兵', color: 'red' }, 'b_k': { name: '將', color: 'black' },
    'b_a': { name: '士', color: 'black' },'b_e': { name: '象', color: 'black' },
    'b_h': { name: '馬', color: 'black' },'b_r': { name: '車', color: 'black' },
    'b_c': { name: '砲', color: 'black' },'b_p': { name: '卒', color: 'black' }
};

const INITIAL_BOARD = [
    ['b_r', 'b_h', 'b_e', 'b_a', 'b_k', 'b_a', 'b_e', 'b_h', 'b_r'],
    [null, null, null, null, null, null, null, null, null],
    [null, 'b_c', null, null, null, null, null, 'b_c', null],
    ['b_p', null, 'b_p', null, 'b_p', null, 'b_p', null, 'b_p'],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ['r_p', null, 'r_p', null, 'r_p', null, 'r_p', null, 'r_p'],
    [null, 'r_c', null, null, null, null, null, 'r_c', null],
    [null, null, null, null, null, null, null, null, null],
    ['r_r', 'r_h', 'r_e', 'r_a', 'r_k', 'r_a', 'r_e', 'r_h', 'r_r']
];

let board = [];
let turn = 'red';
let selectedPiece = null;
let validMoves = [];
let gameOver = false;
let checkMessage = ''; // *** 新增：用來顯示將軍訊息 ***

// --- 遊戲主流程 ---

function initGame() {
    board = JSON.parse(JSON.stringify(INITIAL_BOARD));
    turn = 'red';
    selectedPiece = null;
    validMoves = [];
    gameOver = false;
    checkMessage = '';
    updateTurnIndicator();
    draw();
}

function draw() {
    drawBoard();
    drawPieces();
    if (selectedPiece) {
        highlightSelected();
        highlightValidMoves();
    }
    // *** 新增：畫出將軍提示 ***
    if (checkMessage) {
        ctx.save();
        ctx.font = 'bold 48px "Microsoft JhengHei"';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(checkMessage, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
}

// ... (繪圖相關函式 drawBoard, drawPalaceLine, drawPieces, etc. 維持不變) ...
// 為了簡潔，此處省略與上一版完全相同的繪圖函式，您無需修改它們

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#6b4e33';
    ctx.lineWidth = 2;
    for (let i = 0; i < BOARD_COLS; i++) {
        const x = GRID_SIZE / 2 + i * GRID_SIZE;
        ctx.beginPath(); ctx.moveTo(x, GRID_SIZE / 2); ctx.lineTo(x, GRID_SIZE / 2 + (BOARD_ROWS - 1) * GRID_SIZE); ctx.stroke();
    }
    for (let i = 0; i < BOARD_ROWS; i++) {
        const y = GRID_SIZE / 2 + i * GRID_SIZE;
        ctx.beginPath(); ctx.moveTo(GRID_SIZE / 2, y); ctx.lineTo(GRID_SIZE / 2 + (BOARD_COLS - 1) * GRID_SIZE, y); ctx.stroke();
    }
    drawPalaceLine(3, 0, 5, 2); 
    drawPalaceLine(3, 7, 5, 9); 
    ctx.save();
    ctx.font = '30px "Microsoft JhengHei"'; ctx.fillStyle = '#6b4e33'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.clearRect(GRID_SIZE/2, GRID_SIZE/2 + 4 * GRID_SIZE - 2, (BOARD_COLS - 1) * GRID_SIZE, 4);
    ctx.fillText('楚 河', GRID_SIZE * 2.5, GRID_SIZE * 5);
    ctx.fillText('漢 界', GRID_SIZE * 6.5, GRID_SIZE * 5);
    ctx.restore();
}

function drawPalaceLine(x1, y1, x2, y2) {
    const startX1 = GRID_SIZE / 2 + x1 * GRID_SIZE; const startY1 = GRID_SIZE / 2 + y1 * GRID_SIZE;
    const endX1 = GRID_SIZE / 2 + x2 * GRID_SIZE; const endY1 = GRID_SIZE / 2 + y2 * GRID_SIZE;
    const startX2 = GRID_SIZE / 2 + x2 * GRID_SIZE; const endX2 = GRID_SIZE / 2 + x1 * GRID_SIZE;
    ctx.beginPath(); ctx.moveTo(startX1, startY1); ctx.lineTo(endX1, endY1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(startX2, startY1); ctx.lineTo(endX2, endY1); ctx.stroke();
}

function drawPieces() {
    for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
            const pieceId = board[row][col];
            if (pieceId) {
                const piece = PIECES[pieceId];
                const x = GRID_SIZE / 2 + col * GRID_SIZE; const y = GRID_SIZE / 2 + row * GRID_SIZE;
                ctx.beginPath(); ctx.arc(x, y, PIECE_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = '#f0e68c'; ctx.fill();
                ctx.strokeStyle = piece.color; ctx.lineWidth = 2; ctx.stroke();
                ctx.font = `bold ${PIECE_RADIUS}px "Microsoft JhengHei"`;
                ctx.fillStyle = piece.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(piece.name, x, y);
            }
        }
    }
}

function highlightSelected() {
    const { row, col } = selectedPiece;
    const x = GRID_SIZE / 2 + col * GRID_SIZE; const y = GRID_SIZE / 2 + row * GRID_SIZE;
    ctx.beginPath(); ctx.arc(x, y, PIECE_RADIUS + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = 'blue'; ctx.lineWidth = 3; ctx.stroke();
}

function highlightValidMoves() {
    validMoves.forEach(move => {
        const { row, col } = move;
        const x = GRID_SIZE / 2 + col * GRID_SIZE; const y = GRID_SIZE / 2 + row * GRID_SIZE;
        ctx.beginPath(); ctx.arc(x, y, PIECE_RADIUS / 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; ctx.fill();
    });
}


// --- 遊戲邏輯與規則 (此區有重大更新) ---

function getPieceColor(pieceId) {
    return pieceId ? pieceId.split('_')[0] === 'r' ? 'red' : 'black' : null;
}

// *** BUG修復點：getValidMoves 函式已完整修正 ***
function getValidMoves(row, col, pieceId) {
    const moves = [];
    const pieceType = pieceId.substring(2);
    const color = getPieceColor(pieceId);

    function addMove(r, c) {
        if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS) {
            const targetPiece = board[r][c];
            if (!targetPiece || getPieceColor(targetPiece) !== color) {
                moves.push({ row: r, col: c });
            }
        }
    }
    
    switch (pieceType) {
        case 'k':
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                const newRow = row + dr; const newCol = col + dc;
                if (newCol >= 3 && newCol <= 5 && ((color === 'red' && newRow >= 7 && newRow <= 9) || (color === 'black' && newRow >= 0 && newRow <= 2))) {
                    addMove(newRow, newCol);
                }
            });
            break;
        case 'a':
             [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
                const newRow = row + dr; const newCol = col + dc;
                if (newCol >= 3 && newCol <= 5 && ((color === 'red' && newRow >= 7 && newRow <= 9) || (color === 'black' && newRow >= 0 && newRow <= 2))) {
                    addMove(newRow, newCol);
                }
            });
            break;
        case 'e':
             [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
                const newRow = row + dr; const newCol = col + dc;
                if (newRow < 0 || newRow >= BOARD_ROWS) return;
                const midRow = row + dr / 2; const midCol = col + dc / 2;
                if (board[midRow][midCol] === null) {
                    if ((color === 'red' && newRow >= 5) || (color === 'black' && newRow <= 4)) {
                         addMove(newRow, newCol);
                    }
                }
            });
            break;
        case 'h':
            [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => {
                const newRow = row + dr; const newCol = col + dc;
                let blockRow = row; let blockCol = col;
                if (Math.abs(dr) === 2) { blockRow = row + dr / 2; }
                else { blockCol = col + dc / 2; }
                if (board[blockRow][blockCol] === null) {
                    addMove(newRow, newCol);
                }
            });
            break;
        case 'r':
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                for (let i = 1; i < 10; i++) {
                    const newRow = row + dr * i; const newCol = col + dc * i;
                    if (newRow >= 0 && newRow < BOARD_ROWS && newCol >= 0 && newCol < BOARD_COLS) {
                        if (board[newRow][newCol]) {
                            if (getPieceColor(board[newRow][newCol]) !== color) addMove(newRow, newCol);
                            break;
                        } else {
                            addMove(newRow, newCol);
                        }
                    } else break;
                }
            });
            break;
        case 'c':
             [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                let jumped = false;
                for (let i = 1; i < 10; i++) {
                    const newRow = row + dr * i; const newCol = col + dc * i;
                    if (newRow >= 0 && newRow < BOARD_ROWS && newCol >= 0 && newCol < BOARD_COLS) {
                        if (!board[newRow][newCol]) {
                            if (!jumped) addMove(newRow, newCol);
                        } else {
                            if (!jumped) { jumped = true; } 
                            else {
                                if (getPieceColor(board[newRow][newCol]) !== color) { addMove(newRow, newCol); }
                                break;
                            }
                        }
                    } else break;
                }
            });
            break;
        case 'p':
            const forward = color === 'red' ? -1 : 1;
            addMove(row + forward, col);
            if ((color === 'red' && row < 5) || (color === 'black' && row > 4)) {
                addMove(row, col - 1);
                addMove(row, col + 1);
            }
            break;
    }
    return moves;
}

// *** 新增：檢查遊戲是否結束或將軍的函式 ***
function checkForWinAndCheck() {
    const opponentColor = turn === 'red' ? 'black' : 'red';
    const opponentKingPos = findKing(opponentColor);
    
    // 1. 檢查是否將軍
    checkMessage = '';
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const pieceId = board[r][c];
            if (pieceId && getPieceColor(pieceId) === turn) {
                const moves = getValidMoves(r, c, pieceId);
                if (moves.some(move => move.row === opponentKingPos.row && move.col === opponentKingPos.col)) {
                    checkMessage = '將軍!';
                    break;
                }
            }
        }
        if (checkMessage) break;
    }

    // 2. 檢查是否將帥對決
    const myKingPos = findKing(turn);
    if (myKingPos.col === opponentKingPos.col) {
        let hasPieceBetween = false;
        for (let i = Math.min(myKingPos.row, opponentKingPos.row) + 1; i < Math.max(myKingPos.row, opponentKingPos.row); i++) {
            if (board[i][myKingPos.col]) {
                hasPieceBetween = true;
                break;
            }
        }
        if (!hasPieceBetween) {
            gameOver = true;
            setTimeout(() => {
                alert(`將帥對決！${turn === 'red' ? '紅方' : '黑方'} 獲勝！`);
            }, 100);
        }
    }
}


function findKing(color) {
    const kingId = color === 'red' ? 'r_k' : 'b_k';
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            if (board[r][c] === kingId) return { row: r, col: c };
        }
    }
    return null;
}

function handleBoardClick(event) {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / GRID_SIZE);
    const row = Math.floor(y / GRID_SIZE);

    if (selectedPiece) {
        const isValidMove = validMoves.some(move => move.row === row && move.col === col);
        if (isValidMove) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
        } else {
            selectedPiece = null;
            validMoves = [];
            draw();
        }
    } else {
        const clickedPieceId = board[row] ? board[row][col] : null;
        if (clickedPieceId && getPieceColor(clickedPieceId) === turn) {
            selectedPiece = { row, col, piece: clickedPieceId };
            validMoves = getValidMoves(row, col, clickedPieceId);
            draw();
        }
    }
}

function movePiece(fromRow, fromCol, toRow, toCol) {
    const pieceId = board[fromRow][fromCol];
    const targetId = board[toRow][toCol];
    board[toRow][toCol] = pieceId;
    board[fromRow][fromCol] = null;
    selectedPiece = null;
    validMoves = [];
    
    if (targetId && (targetId === 'r_k' || targetId === 'b_k')) {
        gameOver = true;
        draw();
        setTimeout(() => {
            alert(`${turn === 'red' ? '紅方' : '黑方'} 獲勝！`);
        }, 100);
    } else {
        changeTurn();
        checkForWinAndCheck(); // *** 新增：移動後檢查將軍和勝負 ***
        draw();
    }
}

function changeTurn() {
    turn = turn === 'red' ? 'black' : 'red';
    updateTurnIndicator();
}

function updateTurnIndicator() {
    turnIndicator.textContent = `輪到 ${turn === 'red' ? '紅方' : '黑方'}`;
    turnIndicator.style.color = turn;
}

// --- 事件監聽 ---
canvas.addEventListener('click', handleBoardClick);
restartButton.addEventListener('click', initGame);

// --- 遊戲開始 ---
initGame();