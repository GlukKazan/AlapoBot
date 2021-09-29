"use strict";

var g_width  = 6;
var g_height = 6;

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
        finishMoveCallback(bestMove, bestScore);
    }
}

var materialTable = [0, 100, 200, 300, 1000, 2000, 3000, 0];

function ScoreMove(move){
    var to = (move >> 8) & 0xFF;
    var captured = g_board[to] & 0x7;
    var score = materialTable[captured];
    var row = to & 0xF0;
    if ((row == 0x20) && ((g_toMove == colorWhite) || (score > 0))) score += 1000;
    if ((row == 0x70) && ((g_toMove != colorWhite) || (score > 0))) score += 1000;
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
                    g_board[MakeSquare(row, col)] = pieceEmpty;
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

function FindMove(fen, callback) {
    InitializeFromFen(fen);
    Search(callback);
}

module.exports.FindMove = FindMove;
module.exports.FormatMove = FormatMove;
