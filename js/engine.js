class Engine {
    constructor(context) {
        this.ctx = context;

        this.keys = {
            arrowUp: 38,
            arrowDown: 40,
            arrowLeft: 37,
            arrowRight: 39
        };

        this.mapSize = {
            x: 10,
            y: 10
        };

        this.user = {
            pos: {
                x: 3,
                y: 5
            },
            //fx: "healing",
            frameFxCounter: 0,
            map: "home"
        };

        this.sizeTile = 32;

        this.urls = {
            grass: "./images/grass.png",
            character: "./images/character.png",
            poster: "./images/poster.png",
            tree: "./images/tree.png",
            water: "./images/water.png",
            fireBall: "./images/fireBall.png",
            torch: "./images/torch.png",
            healing: "./images/healing.png",
            exit: "./images/exit.png",
            blocked: "./images/blocked.png"
        };

        this.images = {};
        this.animations = {};
        this.mapsToLoad = ["home", "forest"];
        this.maps = {};

        this.FPS = 0;
        this.lFrameTimer = 0;
        this.framesPerSecCounter = 0;

        this.delta = 0;
        this.lastDelta = 0;

        this.debug = true;
    }

    async initialize() {
        const loadImages = this.loadImages();
        const loadMaps = this.loadMaps();
        const loadAnimations = this.loadAnimations();

        await Promise.all([loadImages, loadMaps, loadAnimations]);
        await this.renderMap();

        this.initializeKeys();

        this.loop();
    }

    loop = () => {
        this.calculateFPS();
        this.framesPerSecCounter = this.framesPerSecCounter + 1;

        this.delta = this.timestamp() - this.lastDelta;
        this.lastDelta = this.timestamp();

        this.clearCanvas();
        this.renderCharacter();
        this.renderEnvironment();
        this.renderAnimation();

        requestAnimationFrame(this.loop);
    };

    calculateFPS() {
        if (this.timestamp() - this.lFrameTimer > 1000) {
            this.FPS = this.framesPerSecCounter;
            this.framesPerSecCounter = 0;
            this.lFrameTimer = this.timestamp();
        }
    }

    timestamp() {
        return window.performance && window.performance.now
            ? window.performance.now()
            : new Date().getTime();
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = src;

            image.onload = () => {
                resolve(image);
            };
            image.onerror = reject;
        });
    }

    async loadMap(map) {
        const response = await fetch(`/maps/${map}.json`);
        const result = await response.json();

        return result;
    }

    async loadMaps() {
        this.mapsToLoad.map(async map => {
            this.maps[map] = await this.loadMap(map);
        });
    }

    async loadAnimations() {
        const response = await fetch("/animations/animations.json");
        const result = await response.json();

        this.animations = result;
    }

    async loadImages() {
        for (let nameUrl in this.urls) {
            const url = this.urls[nameUrl];

            const imageLoaded = await this.loadImage(url);
            this.images[nameUrl] = imageLoaded;
        }
    }

    async renderMap() {
        this.clearCanvasBackground();

        const userMap = this.user.map;

        for (let y = 0; y <= this.mapSize.y - 1; y++) {
            for (let x = 0; x <= this.mapSize.x - 1; x++) {
                const tile = this.maps[userMap][y][x];

                this.ctx.background.drawImage(
                    this.images[tile.background],
                    x * this.sizeTile,
                    y * this.sizeTile
                );

                if (this.debug) {
                    if (tile.blocked) {
                        this.ctx.background.drawImage(
                            this.images.blocked,
                            x * this.sizeTile,
                            y * this.sizeTile
                        );
                    }

                    if (tile.tileExit) {
                        this.ctx.background.drawImage(
                            this.images.exit,
                            x * this.sizeTile,
                            y * this.sizeTile
                        );
                    }
                }
            }
        }
    }

    renderAnimation() {
        const userMap = this.user.map;

        for (let y = 0; y <= this.mapSize.y - 1; y++) {
            for (let x = 0; x <= this.mapSize.x - 1; x++) {
                const tile = this.maps[userMap][y][x];

                if (tile.animation) {
                    const animation = this.animations[tile.animation];

                    if (typeof tile.frameFxCounter === "undefined") {
                        tile.frameFxCounter = 0;
                    }

                    tile.frameFxCounter += this.delta / animation.speed;

                    let frameFxCounter = Math.floor(tile.frameFxCounter);

                    if (frameFxCounter >= animation.frames.length) {
                        tile.frameFxCounter = 0;
                        frameFxCounter = 0;
                    }

                    const frame = animation.frames[frameFxCounter];

                    this.ctx.foreground.drawImage(
                        this.images[tile.animation],
                        frame.sX,
                        frame.sY,
                        frame.width,
                        frame.height,
                        x * this.sizeTile,
                        y * this.sizeTile,
                        frame.width,
                        frame.height
                    );
                }
            }
        }
    }

    renderEnvironment() {
        const userMap = this.user.map;

        for (let y = 0; y <= this.mapSize.y - 1; y++) {
            for (let x = 0; x <= this.mapSize.x - 1; x++) {
                const tile = this.maps[userMap][y][x];

                if (tile.foreground) {
                    this.ctx.foreground.drawImage(
                        this.images[tile.foreground],
                        x * this.sizeTile,
                        y * this.sizeTile
                    );
                }

                if (tile.text) {
                    this.ctx.foreground.font = "12pt Helvetica";
                    this.ctx.foreground.fillStyle = "white";
                    this.ctx.foreground.fillText(
                        tile.text,
                        x * this.sizeTile,
                        y * this.sizeTile
                    );
                }
            }
        }

        this.ctx.foreground.font = "10pt Helvetica";
        this.ctx.foreground.fillStyle = "white";
        this.ctx.foreground.fillText(`FPS: ${this.FPS}`, 40, 20);
        this.ctx.foreground.fillText(
            `POS | X: ${this.user.pos.x} Y: ${this.user.pos.y}`,
            40,
            40
        );
    }

    renderCharacter() {
        this.ctx.foreground.drawImage(
            this.images.character,
            this.user.pos.x * this.sizeTile,
            this.user.pos.y * this.sizeTile - 32
        );

        if (this.user.fx) {
            const animation = this.animations[this.user.fx];

            if (typeof this.user.frameFxCounter === "undefined") {
                this.user.frameFxCounter = 0;
            }

            this.user.frameFxCounter += this.delta / animation.speed;

            let frameFxCounter = Math.floor(this.user.frameFxCounter);

            if (frameFxCounter >= animation.frames.length) {
                this.user.frameFxCounter = 0;
                frameFxCounter = 0;
            }

            const frame = animation.frames[frameFxCounter];

            this.ctx.foreground.drawImage(
                this.images[this.user.fx],
                frame.sX,
                frame.sY,
                frame.width,
                frame.height,
                this.user.pos.x * this.sizeTile + animation.offset.x,
                this.user.pos.y * this.sizeTile + animation.offset.y,
                frame.width,
                frame.height
            );
        }
    }

    clearCanvasBackground() {
        this.ctx.background.clearRect(
            0,
            0,
            this.mapSize.x * this.sizeTile,
            this.mapSize.y * this.sizeTile
        );
    }

    clearCanvas() {
        this.ctx.foreground.clearRect(
            0,
            0,
            this.mapSize.x * this.sizeTile,
            this.mapSize.y * this.sizeTile
        );
    }

    checkTileExit() {
        const { map, pos } = this.user;

        const tile = this.maps[map][pos.y][pos.x];

        if (tile.tileExit) {
            this.user.map = tile.tileExit.map;
            this.user.pos.x = tile.tileExit.x;
            this.user.pos.y = tile.tileExit.y;

            this.renderMap();
        }
    }

    initializeKeys() {
        document.addEventListener("keydown", e => {
            const userMap = this.user.map;

            switch (e.keyCode) {
                case this.keys.arrowUp:
                    if (
                        !this.maps[userMap][this.user.pos.y - 1][
                            this.user.pos.x
                        ].blocked
                    ) {
                        this.user.pos.y--;
                    }
                    break;
                case this.keys.arrowDown:
                    if (
                        !this.maps[userMap][this.user.pos.y + 1][
                            this.user.pos.x
                        ].blocked
                    ) {
                        this.user.pos.y++;
                    }
                    break;
                case this.keys.arrowLeft:
                    if (
                        !this.maps[userMap][this.user.pos.y][
                            this.user.pos.x - 1
                        ].blocked
                    ) {
                        this.user.pos.x--;
                    }
                    break;
                case this.keys.arrowRight:
                    if (
                        !this.maps[userMap][this.user.pos.y][
                            this.user.pos.x + 1
                        ].blocked
                    ) {
                        this.user.pos.x++;
                    }
                    break;
                default:
                    break;
            }

            this.checkTileExit();
        });
    }
}

const background = document.getElementById("background");
const foreground = document.getElementById("foreground");

const context = {
    background: background.getContext("2d"),
    foreground: foreground.getContext("2d")
};

const engine = new Engine(context);
engine.initialize();
