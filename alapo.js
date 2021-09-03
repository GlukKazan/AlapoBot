"use strict";

var g_width  = 6;
var g_height = 6;

function GetFen(){
    var result = "";
    for (var row = 0; row < g_height; row++) {
        if (row != 0) 
            result += '/';
        var empty = 0;
        for (var col = 0; col < g_width; col++) {
            var piece = g_board[((row + 2) << 4) + col + 4];
            if (piece == 0) {
                empty++;
            }
            else {
                if (empty != 0) 
                    result += empty;
                empty = 0;
                
                var pieceChar = [" ", "f", "w", "k", "b", "r", "q", " "][(piece & 0x7)];
                result += ((piece & colorWhite) != 0) ? pieceChar.toUpperCase() : pieceChar;
            }
        }
        if (empty != 0) {
            result += empty;
        }
    }
    result += g_toMove == colorWhite ? " w" : " b";
    return result;
}

function FormatSquare(square) {
    var letters = ['a', 'b', 'c', 'd', 'e', 'f'];
    return letters[(square & 0xF) - 4] + (((g_height + 1) - (square >> 4)) + 1);
}

function FormatMove(move) {
    var result = FormatSquare(move & 0xFF) + '-' + FormatSquare((move >> 8) & 0xFF);
    return result;
}

function Search(finishMoveCallback) {
    var moveList = new Array();
    GenerateAllMoves(moveList);
    var bestMove = 0; var bestScore = 0;
    for (var i = 0; i < moveList.length; i++) {
         var score = ScoreMove(moveList[i]);
         if ((bestMove == 0) || (score > bestScore)) {
              bestMove = moveList[i];
              bestScore = score;
         }
    }
    if (finishMoveCallback != null) {
        MakeMove(bestMove);
        var curFen = GetFen();
        UnmakeMove(bestMove);
        finishMoveCallback(bestMove, curFen, bestScore);
    }
}

var materialTable = [0, 100, 200, 300, 1000, 2000, 3000, 0];

function ScoreMove(move){
    var to = (move >> 8) & 0xFF;
    var captured = g_board[to] & 0x7;
    var score = materialTable[captured];
    var row = to & 0xF0;
    if ((row == 0x20) || (row == 0x70)) score += 1000;
    return score;
}

var colorBlack = 0x10;
var colorWhite = 0x08;

var pieceEmpty  = 0x00;
var pieceFers   = 0x01;
var pieceWasir  = 0x02;
var pieceKing   = 0x03;
var pieceBishop = 0x04;
var pieceRook   = 0x05;
var pieceQueen  = 0x06;

var g_board = new Array(256);
var g_toMove;

var g_moveCount = 0;
var g_moveUndoStack = new Array();

function MakeSquare(row, column) {
    return ((row + 2) << 4) | (column + 4);
}

function InitializeFromFen(fen) {
    var chunks = fen.split(' ');
    
    for (var i = 0; i < 256; i++) 
        g_board[i] = 0x80;
    
    var row = 0;
    var col = 0;
    
    var pieces = chunks[0];
    for (var i = 0; i < pieces.length; i++) {
        var c = pieces.charAt(i);
        
        if (c == '/') {
            row++;
            col = 0;
        }
        else {
            if (c >= '0' && c <= '9') {
                for (var j = 0; j < parseInt(c); j++) {
                    g_board[MakeSquare(row, col)] = 0;
                    col++;
                }
            }
            else {
                var isBlack = c >= 'a' && c <= 'z';
                var piece = isBlack ? colorBlack : colorWhite;
                if (!isBlack) 
                    c = pieces.toLowerCase().charAt(i);
                switch (c) {
                    case 'f':
                        piece |= pieceFers;
                        break;
                    case 'w':
                        piece |= pieceWasir;
                        break;
                    case 'k':
                        piece |= pieceKing;
                        break;
                    case 'b':
                        piece |= pieceBishop;
                        break;
                    case 'r':
                        piece |= pieceRook;
                        break;
                    case 'q':
                        piece |= pieceQueen;
                        break;
                }
                
                g_board[MakeSquare(row, col)] = piece;
                col++;
            }
        }
    }
    
    g_toMove = chunks[1].charAt(0) == 'w' ? colorWhite : 0;
    return '';
}

function MakeMove(move){
	var otherColor = 8 - g_toMove; 
    
    var to = (move >> 8) & 0xFF;
    var from = move & 0xFF;
    var captured = g_board[to];

    g_moveUndoStack[g_moveCount] = new UndoHistory(captured);
    g_moveCount++;

    g_board[to] = g_board[from];
    g_board[from] = pieceEmpty;

    g_toMove = otherColor;
    return true;
}

function UnmakeMove(move){
    g_toMove = 8 - g_toMove;
    
    g_moveCount--;
    var captured = g_moveUndoStack[g_moveCount].captured;

    var to = (move >> 8) & 0xFF;
    var from = move & 0xFF;
    
    g_board[from] = g_board[to];
    g_board[to] = captured;
}

function GenerateMove(moveStack, from, to) {
    moveStack[moveStack.length] = from | (to << 8);
}

function GenerateAllMoves(moveStack) {
    var to;
    var me = g_toMove == colorWhite ? colorWhite : colorBlack;
    var r = me | 0x80;
    for (var from = 0; from < 256; from++) {
         var piece = g_board[from];
         if (piece & me) {
             var pieceType = piece & 7;
             if (pieceType == pieceFers) {
                to = from + 15; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 17; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 15; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 17; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
             }
             if (pieceType == pieceWasir) {
                to = from + 1;  if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 16; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 1;  if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 16; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
             }
             if (pieceType == pieceKing) {
                to = from + 15; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 17; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 15; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 17; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 1;  if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 16; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 1;  if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 16; if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
             }
             if (pieceType == pieceBishop) {
                to = from + 15; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to += 15;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 17; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to += 17;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 15; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to -= 15;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 17; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to -= 17;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
             }
             if (pieceType == pieceRook) {
                to = from + 1; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to++;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 16; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to += 16;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 1; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to--;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 16; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to -= 16}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
             }
             if (pieceType == pieceQueen) {
                to = from + 15; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to += 15;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 17; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to += 17;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 15; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to -= 15;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 17; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to -= 17;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 1; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to++;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from + 16; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to += 16;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 1; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to--;}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
                to = from - 16; while (g_board[to] == 0) {GenerateMove(moveStack, from, to); to -= 16}
                if ((g_board[to] & r) == 0) GenerateMove(moveStack, from, to);
             }
        }
    }
}

function UndoHistory(captured) {
    this.captured = captured;
}

function FindMove(fen, callback) {
    InitializeFromFen(fen);
    Search(callback);
}

module.exports.FindMove = FindMove;
module.exports.FormatMove = FormatMove;
