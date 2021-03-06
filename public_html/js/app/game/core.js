define(['game/draw', 'game/base'], function (draw, base) {
    'use strict';

    var gameObjects = [];

    var gameTypes = {
        player: 1,
        bullet: 2
    };

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    var defaultCoords = [
        {xCur: 0, yCur: 0},
        {xCur: 450, yCur: 450},
        {xCur: 450, yCur: 0},
        {xCur: 0, yCur: 450}
    ];

    var _useRandomStartPosition =true;
    var getNewPlayerPosition = function(id){
        if(!_useRandomStartPosition){
            return defaultCoords[id];
        }

        var x = getRandomInt(0, 9) * 50;//from 0 to 450 with 50px step;
        var y = getRandomInt(0, 9) * 50;

        return {xCur: x, yCur: y};
    };

    var createObject = function (obj)
    {
        gameObjects.push(obj);
        obj.id = gameObjects.indexOf(obj);
        return obj.id;
    };

    var getPlayer = function (id)
    {
        return gameObjects.find(function (item) {
            return item.type === gameTypes.player && item.id === id;
        });
    };

    var createPlayer = function (playerInfo) {
        var newPlayer = base.createObject();

        newPlayer.type = gameTypes.player;
        newPlayer.score = 0;
        newPlayer.health = 100;
        newPlayer.size = {width: 50, height: 50};


        newPlayer.name = playerInfo.name;

        createObject(newPlayer);

        do{
            //make sure that all players will have different positions
            newPlayer.position = getNewPlayerPosition(newPlayer.id);
        } while(gameObjects.find(obj => obj.id !== newPlayer.id && obj.position.xCur === newPlayer.position.xCur && obj.position.yCur === newPlayer.position.yCur))

        draw.player(newPlayer);
        draw.score(newPlayer);
		draw.health(newPlayer);

        var invokeAction = function (command)
        {
            var apply = function () {
                if (newPlayer.position.xCur < 500 && newPlayer.position.yCur < 500 &&
                        newPlayer.position.xCur >= 0 && newPlayer.position.yCur >= 0) {
                    // draw.player(player);
                }
                else if (newPlayer.position.xCur >= 500) {
                    newPlayer.position.xCur = 450;
                }
                else if (newPlayer.position.yCur >= 500) {
                    newPlayer.position.yCur = 450;
                }
                else if (newPlayer.position.xCur < 0) {
                    newPlayer.position.xCur = 0;
                }
                else if (newPlayer.position.yCur < 0) {
                    newPlayer.position.yCur = 0;
                }

                draw.player(newPlayer);
            };

            var fire = function (fromX, fromY, toX, toY)
            {
                var position = {yCur: fromY, xCur: fromX};
                var target = {yCur: toY, xCur: toX};

                var bullet = createBullet({pid: newPlayer.id, position: position, target: target});
                bullet.fire();
            };

            var preFire = function () {

                var enemy = getEnemy(newPlayer.id);
                if (!enemy)
                    return;

                var target = enemy.position;

                fire(newPlayer.position.xCur + newPlayer.size.width / 2,
                        newPlayer.position.yCur + newPlayer.size.height / 2,
                        target.xCur + enemy.size.width / 2,
                        target.yCur + enemy.size.height / 2);
            };



            var move = function (command) {
                var enemy = getEnemy(newPlayer.id);

                var playerShadow = cloneObject(newPlayer);

                var position = playerShadow.position;

                switch (command) {
                    case actionTypes.moveUp:
                        position.yCur -= 50;
                        break;
                    case actionTypes.moveDown:
                        position.yCur += 50;
                        break;
                    case actionTypes.moveLeft:
                        position.xCur -= 50;
                        break;
                    case actionTypes.moveRight:
                        position.xCur += 50;
                        break;
                    default:
                        break;
                }

                if (!enemy.hitTest(playerShadow)) {
                    newPlayer.position = playerShadow.position;
                }

                apply();
            };


            switch (command)
            {
                case actionTypes.fire:
                    preFire();
                    break;

                default:
                    move(command);
            }
        };

        newPlayer.getNextAction = function (info) {
            var self = cloneObject(newPlayer);
            var command = playerInfo.getNextAction(info, self);

            if (command)
                invokeAction(command);
        };

        return newPlayer;
    };

    var createBullet = function (bulletInfo)
    {
        var bullet = base.createObject();
        bullet.type = gameTypes.bullet;
        bullet.pid = bulletInfo.pid;
        bullet.position = bulletInfo.position;
        bullet.target = bulletInfo.target;

        bullet.size = {width: 10, height: 10};

        createObject(bullet);

        bullet.fire = function () {
            draw.bullet(bullet);

            var speed = 25;
            var deltaX = (bullet.target.xCur - bullet.position.xCur);
            var deltaY = (bullet.target.yCur - bullet.position.yCur);
            var long = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            var k = 0;
            if (long != 0)
                k = speed / long;
            var stepX = k * deltaX;
            var stepY = k * deltaY;

            var nextAction = function ()
            {
                bullet.position.xCur += stepX;
                bullet.position.yCur += stepY;

                draw.bullet(bullet);

                var enemy = getEnemy(bullet.pid);

                if (bullet.hitTest(enemy)) {
                    killBullet();

                    var player = getPlayer(bulletInfo.pid);
                    player.score++;
                    enemy.health--;
                    draw.score(player);
                    draw.health(enemy);
                    if(enemy.health===0){
						stopGame();
                        draw.win(player)
                    }
                }
                if (!checkBullet())
                    killBullet();
            };

            bullet.getNextAction = function () {
                return nextAction;
            };
        };



        var checkBullet = function ()
        {
            if (bullet.position.xCur >= 500 || bullet.position.xCur <= 0 ||
                    bullet.position.yCur >= 500 || bullet.position.yCur <= 0)
                return false;

            return true;
        };

        var killBullet = function () {
            delete gameObjects[bullet.id];
            draw.remove(bullet);
        };

        return bullet;
    };

    var setPlayer = function (playerInfo)
    {
        var player = createPlayer(playerInfo);

        return player.id;
    };

    var cloneObject = function (obj) {
        if (obj) {
            return JSON.parse(JSON.stringify(obj));
        }
        else {
            return null;
        }
    };

    var getEnemy = function (id)
    {
        return gameObjects.find(function (item) {
            return item.id !== id && item.type === gameTypes.player;
        });
    };

    var getGameInfo = function () {
        var botEye = [];
        for (var i = 0; i < gameObjects.length; i++) {
            if (!gameObjects[i])
                continue;
            var temp = cloneObject(gameObjects[i]);
            botEye.push(temp);
        }
        return botEye;
    };

    var gameCycle;
    var isGame;

    var startGame = function (frequency) {
        if (isGame || !frequency){
            return;}

        var iteration = function () {
            if (!isGame)
                return;

            var info = getGameInfo();

            for (var i = 0; i < gameObjects.length; i++)
            {
                if (!gameObjects[i])
                    continue;

                var action = gameObjects[i].getNextAction(info);
                action && action();

            }
            setTimeout(iteration, frequency);

        };

        isGame = true;
        iteration();
    };


    var stopGame = function () {
        if (gameCycle)
            clearTimeout(gameCycle);

        isGame = false;
    };

    var actionTypes = {
        'moveUp': 1,
        'moveDown': 2,
        'moveLeft': 3,
        'moveRight': 4,
        'fire': 5
    };

    var core = {
        setPlayer: setPlayer,
        startGame: startGame,
        stopGame: stopGame,
        actionTypes: actionTypes,
        gameTypes: gameTypes
    };
    return core;
});