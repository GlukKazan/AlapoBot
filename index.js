"use strict";

const garbo = require('./alapo');
const axios = require('axios');

const STATE = {
    WAIT: 0,
    INIT: 1,
    TURN: 2,
    RECO: 3,
    MOVE: 4,
    STOP: 5
};

const SERVICE  = 'http://127.0.0.1:3000';
const USERNAME = 'alapo';
const PASSWORD = 'alapo';

let TOKEN   = null;
let sid     = null;
let uid     = null;
let setup   = null;
let turn    = null;

var winston = require('winston');
require('winston-daily-rotate-file');

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(
        info => `${info.level}: ${info.timestamp} - ${info.message}`
    )
);

var transport = new winston.transports.DailyRotateFile({
    dirname: '',
    filename: 'alapo-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

var logger = winston.createLogger({
    format: logFormat,
    transports: [
      transport
    ]
});

function App() {
    this.state  = STATE.INIT;
    this.states = [];
}

let app = new App();

let init = function(app) {
    console.log('INIT');
    app.state = STATE.WAIT;
    axios.post(SERVICE + '/api/auth/login', {
        username: USERNAME,
        password: PASSWORD
    })
    .then(function (response) {
      TOKEN = response.data.access_token;
      app.state = STATE.TURN;
    })
    .catch(function (error) {
      console.log('INIT ERROR: ' + error);
      logger.error('INIT ERROR: ' + error);
      app.state  = STATE.STOP;
    });
    return true;
}

let checkTurn = function(app) {
    app.state = STATE.WAIT;
    axios.get(SERVICE + '/api/session/current/134', {
        headers: { Authorization: `Bearer ${TOKEN}` }
    })
    .then(function (response) {
        if (response.data.length > 0) {
            sid = response.data[0].id;
            setup = response.data[0].last_setup;
            app.state = STATE.RECO;
        } else {
            app.state = STATE.TURN;
        }
    })
    .catch(function (error) {
        console.log('TURN ERROR: ' + error);
        logger.error('TURN ERROR: ' + error);
        app.state  = STATE.INIT;
    });
    return true;
}

let recovery = function(app) {
    console.log('RECO');
    app.state = STATE.WAIT;
    axios.post(SERVICE + '/api/session/recovery', {
        id: sid,
        setup_required: true
    }, {
        headers: { Authorization: `Bearer ${TOKEN}` }
    })
    .then(function (response) {
        console.log(response.data);
        uid = response.data.uid;
        app.state = STATE.MOVE;
    })
    .catch(function (error) {
        console.log('RECO ERROR: ' + error);
        logger.error('RECO ERROR: ' + error);
        app.state  = STATE.INIT;
    });
    return true;
}

function FinishTurnCallback(bestMove, value) {
    if (bestMove != null) {
        let move = garbo.FormatMove(bestMove);
        const result = setup.match(/[?&]turn=(\d+)/);
        if (result) {
            turn = result[1];
        }
        console.log('move = ' + move + ', value=' + value);
        logger.info('move = ' + move + ', value=' + value);
        app.state  = STATE.WAIT;
        axios.post(SERVICE + '/api/move', {
            uid: uid,
            next_player: (turn == 0) ? 2 : 1,
            move_str: move,
            note: 'value=' + value
        }, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        })
        .then(function (response) {
            app.state  = STATE.TURN;
        })
        .catch(function (error) {
            console.log('MOVE ERROR: ' + error);
            logger.error('MOVE ERROR: ' + error);
            app.state  = STATE.INIT;
        });
    }
    app.state  = STATE.STOP;
}

let sendMove = function(app) {
    console.log('MOVE');
    app.state  = STATE.WAIT;
    const result = setup.match(/[?&]setup=(.*)/);
    if (result) {
        let fen = result[1];
        console.log('[' + sid + '] fen = ' + fen);
        logger.info('[' + sid + '] fen = ' + fen);
        garbo.FindMove(fen, FinishTurnCallback);
    } else {
        app.state  = STATE.STOP;
    }
    return true;
}

let wait = function(app) {
    return true;
}

let stop = function(app) {
    console.log('STOP');
    logger.info('STOP');
    return false;
}

App.prototype.exec = function() {
    if (!this.states[this.state]) return true;
    return this.states[this.state](this);
}

app.states[STATE.INIT] = init;
app.states[STATE.WAIT] = wait;
app.states[STATE.STOP] = stop;
app.states[STATE.TURN] = checkTurn;
app.states[STATE.MOVE] = sendMove;
app.states[STATE.RECO] = recovery;

let run = function() {
    if (app.exec()) {
        setTimeout(run, 1000);
    }
}
run();
