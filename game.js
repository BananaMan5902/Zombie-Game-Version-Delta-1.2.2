"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ============================================================
// WORLD
// ============================================================

const WORLD_WIDTH = 7000;
const WORLD_HEIGHT = 7000;

const world = {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT
};

// ============================================================
// INPUT
// ============================================================

const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    if (["1", "2", "3", "4", "5"].includes(e.key)) {
        switchWeapon(Number(e.key) - 1);
    }

    if (e.key.toLowerCase() === "e") {
        buyUpgrade();
    }

    if (e.key.toLowerCase() === "r" && gameOver) {
        restartGame();
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

const mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    down: false
};

canvas.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => {
    mouse.down = true;
});

canvas.addEventListener("mouseup", () => {
    mouse.down = false;
});

canvas.addEventListener("mouseleave", () => {
    mouse.down = false;
});

// ============================================================
// PLAYER
// ============================================================

const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2 + 500,

    radius: 18,

    health: 100,
    maxHealth: 100,

    speed: 180,
    sprintSpeed: 290,

    angle: 0,

    kills: 0,

    damageBonus: 0
};

// ============================================================
// WEAPONS
// ============================================================

const weapons = [
    {
        name: "Pistol",
        damage: 28,
        fireRate: 240,
        range: 900,
        bulletSpeed: 1200,
        spread: 0.025,
        pellets: 1,
        color: "#f5f5f5"
    },

    {
        name: "Shotgun",
        damage: 18,
        fireRate: 850,
        range: 520,
        bulletSpeed: 850,
        spread: 0.22,
        pellets: 9,
        color: "#ffd166"
    },

    {
        name: "Flamethrower",
        damage: 6,
        fireRate: 90,
        range: 370,
        bulletSpeed: 0,
        spread: 0.35,
        pellets: 6,
        color: "#ff6b00"
    },

    {
        name: "Machine Gun",
        damage: 11,
        fireRate: 75,
        range: 1050,
        bulletSpeed: 1300,
        spread: 0.13,
        pellets: 1,
        color: "#e0e0e0"
    },

    {
        name: "Rifle",
        damage: 90,
        fireRate: 900,
        range: 1500,
        bulletSpeed: 1700,
        spread: 0.006,
        pellets: 1,
        color: "#ffffff"
    }
];

let currentWeapon = 0;
let lastShot = 0;

function switchWeapon(index) {
    if (index >= 0 && index < weapons.length) {
        currentWeapon = index;
        updateHUD();
    }
}

// ============================================================
// BULLETS
// ============================================================

const bullets = [];

function shoot() {
    const now = performance.now();
    const weapon = weapons[currentWeapon];

    if (now - lastShot < weapon.fireRate) return;

    lastShot = now;

    player.angle = Math.atan2(
        mouse.y - canvas.height / 2,
        mouse.x - canvas.width / 2
    );

    if (currentWeapon === 2) {
        flamethrowerAttack();
        return;
    }

    for (let i = 0; i < weapon.pellets; i++) {
        const spread =
            (Math.random() - 0.5) * weapon.spread;

        bullets.push({
            x: player.x,
            y: player.y,

            angle: player.angle + spread,

            speed: weapon.bulletSpeed,

            damage:
                weapon.damage *
                (1 + player.damageBonus),

            range: weapon.range,

            distance: 0,

            radius: currentWeapon === 4 ? 4 : 3,

            color: weapon.color
        });
    }
}

// ============================================================
// FLAMETHROWER
// ============================================================

function flamethrowerAttack() {
    const weapon = weapons[2];

    for (const zombie of zombies) {
        const dx = zombie.x - player.x;
        const dy = zombie.y - player.y;

        const distance = Math.hypot(dx, dy);

        if (distance > weapon.range) continue;

        const angle = Math.atan2(dy, dx);

        let difference =
            Math.atan2(
                Math.sin(angle - player.angle),
                Math.cos(angle - player.angle)
            );

        if (Math.abs(difference) < weapon.spread) {

            zombie.health -=
                weapon.damage *
                (1 + player.damageBonus);

            zombie.burning = true;
            zombie.burnTimer = 3000;

            if (zombie.health <= 0) {
                killZombie(zombie);
            }
        }
    }
}

// ============================================================
// ZOMBIES
// ============================================================

const zombies = [];

const zombieTypes = {
    weakSlow: {
        health: 45,
        speed: 50,
        damage: 7,
        radius: 15
    },

    tankSlow: {
        health: 180,
        speed: 30,
        damage: 15,
        radius: 22,
        bucket: true
    },

    fastWeak: {
        health: 35,
        speed: 105,
        damage: 8,
        radius: 14
    },

    tankFast: {
        health: 280,
        speed: 62,
        damage: 20,
        radius: 24,
        bucket: true
    }
};

function spawnZombie(typeName, boss = false) {

    const type = zombieTypes[typeName];

    let x;
    let y;

    const side = Math.floor(Math.random() * 4);

    if (side === 0) {
        x = Math.random() * WORLD_WIDTH;
        y = 100;
    } else if (side === 1) {
        x = WORLD_WIDTH - 100;
        y = Math.random() * WORLD_HEIGHT;
    } else if (side === 2) {
        x = Math.random() * WORLD_WIDTH;
        y = WORLD_HEIGHT - 100;
    } else {
        x = 100;
        y = Math.random() * WORLD_HEIGHT;
    }

    const zombie = {
        x,
        y,

        health: type.health,
        maxHealth: type.health,

        speed: type.speed,

        damage: type.damage,

        radius: type.radius,

        bucket: type.bucket || false,

        burning: false,
        burnTimer: 0,

        attackCooldown: 0,

        boss
    };

    if (boss) {
        zombie.health = 3000;
        zombie.maxHealth = 3000;
        zombie.speed = 45;
        zombie.radius = 48;
        zombie.damage = 35;
    }

    zombies.push(zombie);
}

// ============================================================
// WAVES
// ============================================================

let wave = 1;
let waveTimer = 0;
let waveDelay = 4;

function spawnWave() {

    if (wave > 100) return;

    const amount =
        wave === 100
            ? 1
            : Math.min(5 + wave * 2, 150);

    for (let i = 0; i < amount; i++) {

        let type;

        const roll = Math.random();

        if (wave < 5) {
            type = "weakSlow";
        } else if (roll < 0.3) {
            type = "weakSlow";
        } else if (roll < 0.55) {
            type = "fastWeak";
        } else if (roll < 0.8) {
            type = "tankSlow";
        } else {
            type = "tankFast";
        }

        spawnZombie(type);
    }

    if (wave === 100) {
        spawnZombie("tankFast", true);

        showMessage("⚠️ BOSS WAVE ⚠️");
    } else {
        showMessage("WAVE " + wave);
    }
}

// ============================================================
// MAP OBJECTS
// ============================================================

const trees = [];
const houses = [];
const ponds = [];
const roads = [];

function generateMap() {

    // Roads
    roads.push({
        x: WORLD_WIDTH / 2 - 110,
        y: 0,
        width: 220,
        height: WORLD_HEIGHT
    });

    roads.push({
        x: 0,
        y: WORLD_HEIGHT / 2 - 110,
        width: WORLD_WIDTH,
        height: 220
    });

    // Ponds
    for (let i = 0; i < 12; i++) {
        ponds.push({
            x: 500 + Math.random() * (WORLD_WIDTH - 1000),
            y: 500 + Math.random() * (WORLD_HEIGHT - 1000),
            width: 250 + Math.random() * 450,
            height: 180 + Math.random() * 350
        });
    }

    // Houses
    for (let i = 0; i < 35; i++) {

        const house = {
            x: 300 + Math.random() * (WORLD_WIDTH - 600),
            y: 300 + Math.random() * (WORLD_HEIGHT - 600),
            width: 130 + Math.random() * 80,
            height: 100 + Math.random() * 60
        };

        houses.push(house);
    }

    // Trees
    for (let i = 0; i < 350; i++) {

        trees.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            radius: 12 + Math.random() * 10
        });
    }
}

generateMap();

// ============================================================
// MARKET
// ============================================================

const market = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    width: 500,
    height: 400
};

function buyUpgrade() {

    const distance = Math.hypot(
        player.x - market.x,
        player.y - market.y
    );

    if (distance > 350) {
        showMessage("Get closer to the market!");
        return;
    }

    if (player.kills < 100) {
        showMessage(
            "Need " + (100 - player.kills) + " more kills!"
        );
        return;
    }

    player.kills -= 100;
    player.damageBonus += 0.05;

    showMessage(
        "DAMAGE +5%"
    );

    updateHUD();
}

// ============================================================
// CAMERA
// ============================================================

const camera = {
    x: 0,
    y: 0
};

function updateCamera() {

    camera.x =
        player.x -
        canvas.width / 2;

    camera.y =
        player.y -
        canvas.height / 2;

    camera.x = Math.max(
        0,
        Math.min(
            WORLD_WIDTH - canvas.width,
            camera.x
        )
    );

    camera.y = Math.max(
        0,
        Math.min(
            WORLD_HEIGHT - canvas.height,
            camera.y
        )
    );
}

// ============================================================
// COLLISION
// ============================================================

function circleRectCollision(circle, rect) {

    const closestX = Math.max(
        rect.x,
        Math.min(circle.x, rect.x + rect.width)
    );

    const closestY = Math.max(
        rect.y,
        Math.min(circle.y, rect.y + rect.height)
    );

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return (
        dx * dx +
        dy * dy <
        circle.radius * circle.radius
    );
}

function isBlocked(x, y, radius) {

    const object = {
        x,
        y,
        radius
    };

    for (const house of houses) {
        if (circleRectCollision(object, house)) {
            return true;
        }
    }

    return false;
}

// ============================================================
// UPDATE PLAYER
// ============================================================

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    if (dx !== 0 || dy !== 0) {

        const length =
            Math.hypot(dx, dy);

        dx /= length;
        dy /= length;

        const speed =
            keys["shift"]
                ? player.sprintSpeed
                : player.speed;

        const newX =
            player.x + dx * speed * dt;

        const newY =
            player.y + dy * speed * dt;

        if (!isBlocked(newX, player.y, player.radius)) {
            player.x = newX;
        }

        if (!isBlocked(player.x, newY, player.radius)) {
            player.y = newY;
        }
    }

    player.x = Math.max(
        player.radius,
        Math.min(
            WORLD_WIDTH - player.radius,
            player.x
        )
    );

    player.y = Math.max(
        player.radius,
        Math.min(
            WORLD_HEIGHT - player.radius,
            player.y
        )
    );

    player.angle = Math.atan2(
        mouse.y - canvas.height / 2,
        mouse.x - canvas.width / 2
    );
}

// ============================================================
// UPDATE BULLETS
// ============================================================

function updateBullets(dt) {

    for (let i = bullets.length - 1; i >= 0; i--) {

        const bullet = bullets[i];

        const move =
            bullet.speed * dt;

        bullet.x +=
            Math.cos(bullet.angle) * move;

        bullet.y +=
            Math.sin(bullet.angle) * move;

        bullet.distance += move;

        if (
            bullet.distance >
            bullet.range
        ) {
            bullets.splice(i, 1);
            continue;
        }

        let hit = false;

        for (let j = zombies.length - 1; j >= 0; j--) {

            const zombie = zombies[j];

            const distance =
                Math.hypot(
                    bullet.x - zombie.x,
                    bullet.y - zombie.y
                );

            if (
                distance <
                bullet.radius + zombie.radius
            ) {

                zombie.health -=
                    bullet.damage;

                if (zombie.health <= 0) {
                    killZombie(zombie);
                }

                hit = true;
                break;
            }
        }

        if (hit) {
            bullets.splice(i, 1);
        }
    }
}

// ============================================================
// UPDATE ZOMBIES
// ============================================================

function updateZombies(dt) {

    for (let i = zombies.length - 1; i >= 0; i--) {

        const zombie = zombies[i];

        // Burning
        if (zombie.burning) {

            zombie.burnTimer -= dt * 1000;

            zombie.health -=
                8 * dt;

            if (Math.random() < 0.04) {
                spreadFire(zombie);
            }

            if (zombie.burnTimer <= 0) {
                zombie.burning = false;
            }
        }

        if (zombie.health <= 0) {
            killZombie(zombie);
            continue;
        }

        const dx =
            player.x - zombie.x;

        const dy =
            player.y - zombie.y;

        const distance =
            Math.hypot(dx, dy);

        if (distance > 0) {

            const nx = dx / distance;
            const ny = dy / distance;

            if (
                distance >
                player.radius + zombie.radius + 4
            ) {

                const newX =
                    zombie.x +
                    nx *
                    zombie.speed *
                    dt;

                const newY =
                    zombie.y +
                    ny *
                    zombie.speed *
                    dt;

                if (
                    !isBlocked(
                        newX,
                        zombie.y,
                        zombie.radius
                    )
                ) {
                    zombie.x = newX;
                }

                if (
                    !isBlocked(
                        zombie.x,
                        newY,
                        zombie.radius
                    )
                ) {
                    zombie.y = newY;
                }

            } else {

                zombie.attackCooldown -=
                    dt * 1000;

                if (zombie.attackCooldown <= 0) {

                    player.health -=
                        zombie.damage;

                    zombie.attackCooldown =
                        700;

                    if (player.health <= 0) {
                        player.health = 0;
                        endGame(false);
                    }
                }
            }
        }
    }
}

// ============================================================
// FIRE SPREAD
// ============================================================

function spreadFire(source) {

    for (const zombie of zombies) {

        if (zombie === source) continue;

        const distance =
            Math.hypot(
                source.x - zombie.x,
                source.y - zombie.y
            );

        if (
            distance < 85 &&
            Math.random() < 0.08
        ) {
            zombie.burning = true;
            zombie.burnTimer = 2500;
        }
    }
}

// ============================================================
// KILL ZOMBIE
// ============================================================

function killZombie(zombie) {

    const index =
        zombies.indexOf(zombie);

    if (index === -1) return;

    zombies.splice(index, 1);

    if (zombie.boss) {
        endGame(true);
        return;
    }

    player.kills++;

    updateHUD();
}

// ============================================================
// DRAW WORLD
// ============================================================

function drawWorld() {

    ctx.fillStyle = "#6d8750";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Roads
    ctx.fillStyle = "#4a4a46";

    for (const road of roads) {

        ctx.fillRect(
            road.x - camera.x,
            road.y - camera.y,
            road.width,
            road.height
        );
    }

    // Road lines
    ctx.strokeStyle = "#b9a95b";
    ctx.lineWidth = 5;
    ctx.setLineDash([35, 35]);

    for (const road of roads) {

        if (road.width < road.height) {

            ctx.beginPath();

            ctx.moveTo(
                road.x +
                road.width / 2 -
                camera.x,
                -camera.y
            );

            ctx.lineTo(
                road.x +
                road.width / 2 -
                camera.x,
                WORLD_HEIGHT -
                camera.y
            );

            ctx.stroke();

        } else {

            ctx.beginPath();

            ctx.moveTo(
                -camera.x,
                road.y +
                road.height / 2 -
                camera.y
            );

            ctx.lineTo(
                WORLD_WIDTH -
                camera.x,
                road.y +
                road.height / 2 -
                camera.y
            );

            ctx.stroke();
        }
    }

    ctx.setLineDash([]);

    // Ponds
    for (const pond of ponds) {

        ctx.fillStyle = "#347ea8";

        ctx.beginPath();

        ctx.ellipse(
            pond.x - camera.x,
            pond.y - camera.y,
            pond.width / 2,
            pond.height / 2,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // Houses
    for (const house of houses) {

        ctx.fillStyle = "#8b7355";

        ctx.fillRect(
            house.x - camera.x,
            house.y - camera.y,
            house.width,
            house.height
        );

        ctx.fillStyle = "#5c4033";

        ctx.fillRect(
            house.x - camera.x + 20,
            house.y - camera.y + 20,
            35,
            45
        );

        ctx.fillStyle = "#4d2f20";

        ctx.beginPath();

        ctx.moveTo(
            house.x - camera.x - 10,
            house.y - camera.y
        );

        ctx.lineTo(
            house.x -
            camera.x +
            house.width / 2,
            house.y -
            camera.y -
            45
        );

        ctx.lineTo(
            house.x -
            camera.x +
            house.width +
            10,
            house.y -
            camera.y
        );

        ctx.closePath();

        ctx.fill();
    }

    // Trees
    for (const tree of trees) {

        if (
            tree.x < camera.x - 50 ||
            tree.x > camera.x + canvas.width + 50 ||
            tree.y < camera.y - 50 ||
            tree.y > camera.y + canvas.height + 50
        ) {
            continue;
        }

        ctx.fillStyle = "#4c3524";

        ctx.fillRect(
            tree.x -
            camera.x -
            5,
            tree.y -
            camera.y,
            10,
            25
        );

        ctx.fillStyle = "#315f35";

        ctx.beginPath();

        ctx.arc(
            tree.x - camera.x,
            tree.y - camera.y,
            tree.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawMarket();
}

// ============================================================
// DRAW MARKET
// ============================================================

function drawMarket() {

    const x =
        market.x - camera.x;

    const y =
        market.y - camera.y;

    ctx.fillStyle = "#c4a15a";

    ctx.fillRect(
        x - market.width / 2,
        y - market.height / 2,
        market.width,
        market.height
    );

    ctx.strokeStyle = "#3b3025";
    ctx.lineWidth = 8;

    ctx.strokeRect(
        x - market.width / 2,
        y - market.height / 2,
        market.width,
        market.height
    );

    ctx.fillStyle = "#eee";

    ctx.font = "bold 42px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "MARKET",
        x,
        y - 70
    );

    ctx.font = "22px Arial";

    ctx.fillText(
        "100 KILLS = +5% DAMAGE",
        x,
        y - 25
    );

    ctx.fillText(
        "Press E",
        x,
        y + 15
    );
}

// ============================================================
// DRAW PLAYER
// ============================================================

function drawPlayer() {

    const x =
        player.x - camera.x;

    const y =
        player.y - camera.y;

    // Body
    ctx.fillStyle = "#273b52";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Weapon
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 7;

    ctx.beginPath();

    ctx.moveTo(x, y);

    ctx.lineTo(
        x +
        Math.cos(player.angle) * 34,
        y +
        Math.sin(player.angle) * 34
    );

    ctx.stroke();

    // Direction marker
    ctx.fillStyle = "#eee";

    ctx.beginPath();

    ctx.arc(
        x +
        Math.cos(player.angle) * 9,
        y +
        Math.sin(player.angle) * 9,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// ============================================================
// DRAW ZOMBIES
// ============================================================

function drawZombies() {

    for (const zombie of zombies) {

        const x =
            zombie.x - camera.x;

        const y =
            zombie.y - camera.y;

        if (
            x < -100 ||
            x > canvas.width + 100 ||
            y < -100 ||
            y > canvas.height + 100
        ) {
            continue;
        }

        if (zombie.boss) {

            ctx.fillStyle = "#551111";

        } else if (zombie.bucket) {

            ctx.fillStyle = "#5a7050";

        } else {

            ctx.fillStyle = "#66805b";
        }

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            zombie.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // Eyes
        ctx.fillStyle = "#222";

        ctx.beginPath();

        ctx.arc(
            x - zombie.radius * 0.35,
            y - 3,
            3,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x + zombie.radius * 0.35,
            y - 3,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // Bucket
        if (zombie.bucket) {

            ctx.fillStyle = "#777";

            ctx.fillRect(
                x - zombie.radius * 0.75,
                y - zombie.radius * 1.05,
                zombie.radius * 1.5,
                zombie.radius * 0.45
            );
        }

        // Burning
        if (zombie.burning) {

            ctx.fillStyle = "#ff8c00";

            ctx.beginPath();

            ctx.arc(
                x,
                y - zombie.radius - 8,
                8 + Math.random() * 5,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        // Health bar
        const barWidth =
            zombie.radius * 2.4;

        const healthPercent =
            zombie.health /
            zombie.maxHealth;

        ctx.fillStyle = "#222";

        ctx.fillRect(
            x - barWidth / 2,
            y - zombie.radius - 18,
            barWidth,
            5
        );

        ctx.fillStyle = "#55aa55";

        ctx.fillRect(
            x - barWidth / 2,
            y - zombie.radius - 18,
            barWidth * healthPercent,
            5
        );

        if (zombie.boss) {

            ctx.fillStyle = "#fff";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";

            ctx.fillText(
                "BOSS",
                x,
                y - zombie.radius - 28
            );
        }
    }
}

// ============================================================
// DRAW BULLETS
// ============================================================

function drawBullets() {

    for (const bullet of bullets) {

        ctx.fillStyle = bullet.color;

        ctx.beginPath();

        ctx.arc(
            bullet.x - camera.x,
            bullet.y - camera.y,
            bullet.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

// ============================================================
// HUD
// ============================================================

function updateHUD() {

    document.getElementById("health").textContent =
        Math.ceil(player.health);

    document.getElementById("weapon").textContent =
        weapons[currentWeapon].name;

    document.getElementById("kills").textContent =
        player.kills;

    document.getElementById("wave").textContent =
        wave;

    document.getElementById("damageBonus").textContent =
        "Damage bonus: +" +
        Math.round(player.damageBonus * 100) +
        "%";
}

// ============================================================
// MESSAGE
// ============================================================

let messageTimer = 0;

function showMessage(text) {

    const element =
        document.getElementById("message");

    element.textContent = text;

    messageTimer = 2;
}

// ============================================================
// GAME OVER
// ============================================================

let gameOver = false;

function endGame(won) {

    if (gameOver) return;

    gameOver = true;
    mouse.down = false;

    const message =
        document.getElementById("message");

    if (won) {

        message.innerHTML =
            "🏆 YOU DEFEATED THE BOSS!<br>" +
            "<small>You survived all 100 waves!</small>";

    } else {

        message.innerHTML =
            "💀 GAME OVER<br>" +
            "<small>Press R to restart</small>";
    }

    message.classList.add("game-ended");
}

// ============================================================
// RESTART
// ============================================================

function restartGame() {

    player.x =
        WORLD_WIDTH / 2;

    player.y =
        WORLD_HEIGHT / 2 + 500;

    player.health =
        player.maxHealth;

    player.kills = 0;

    player.damageBonus = 0;

    currentWeapon = 0;

    wave = 1;

    waveTimer = 0;

    zombies.length = 0;
    bullets.length = 0;

    gameOver = false;

    document
        .getElementById("message")
        .classList.remove("game-ended");

    spawnWave();

    updateHUD();
}

// ============================================================
// GAME LOOP
// ============================================================

let lastTime = performance.now();

function gameLoop(now) {

    const dt =
        Math.min(
            (now - lastTime) / 1000,
            0.05
        );

    lastTime = now;

    if (!gameOver) {

        updatePlayer(dt);

        if (mouse.down) {
            shoot();
        }

        updateBullets(dt);

        updateZombies(dt);

        updateCamera();

        // Wave progression
        if (
            zombies.length === 0 &&
            wave < 100
        ) {

            waveTimer += dt;

            if (waveTimer >= waveDelay) {

                wave++;

                waveTimer = 0;

                spawnWave();

                updateHUD();
            }
        }
    }

    drawWorld();
    drawBullets();
    drawZombies();
    drawPlayer();

    if (messageTimer > 0 && !gameOver) {

        messageTimer -= dt;

        if (messageTimer <= 0) {
            document.getElementById(
                "message"
            ).textContent = "";
        }
    }

    requestAnimationFrame(gameLoop);
}

// ============================================================
// START GAME IMMEDIATELY
// ============================================================

spawnWave();
updateHUD();
updateCamera();

requestAnimationFrame(gameLoop);
