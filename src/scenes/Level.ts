import Phaser from "phaser";
import ShadowContainer from "../prefabs/ShadowContainer";
import Shadow from "../prefabs/Shadow";
import { GameStateContent, GameInfo, UserInformation } from "~/data/gameState";

interface Message {
    type: string;
    payload: any;
}

export default class Level extends Phaser.Scene {
    constructor() {
        super("Level");
    }

    // Game state and scene objects
    gameInfo: GameInfo | undefined;
    gameState: GameStateContent | undefined;
    userInfo: UserInformation | undefined;

    // Scene elements
    private shadowContainer!: ShadowContainer;
    private wrongText: Phaser.GameObjects.Text | null = null;
    private key_start_debug!: Phaser.Input.Keyboard.Key;

    create() {
        this.editorCreate();
        window.addEventListener("message", this.handleMessage);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("message", this.handleMessage);
        });
        this.key_start_debug.on("down", () => this.initGame("debug"));
        this.requestUserInfo();
    }

    editorCreate(): void {
        // Ensure that this.input.keyboard exists before accessing addKey
    if (this.input.keyboard) {
        this.key_start_debug = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);

        // Check if the key was successfully created
        if (this.key_start_debug) {
            this.key_start_debug.on('down', () => this.initGame('debug'));
        } else {
            console.error("Failed to initialize F1 key.");
        }
    }
        this.add.image(this.scale.width / 2, this.scale.height / 2, "BG");
        this.add.image(this.scale.width / 2, this.scale.height / 2, "GRASS");
        this.add.image(this.scale.width / 2, this.scale.height / 2, "Shadow_Panel");
    }

    handleMessage = (event: MessageEvent) => {
        console.info("PHASER handleMessage:", JSON.stringify(event.data));

        switch (event.data.type) {
            case "requestInit":
                this.handleRequestInit(event.data.payload);
                break;
            case "serverGameUpdate":
                this.updateState(event.data.payload);
                break;
            case "requestParam":
                this.handleRequestParam(event.data.payload);
                break;
            case "restartGame":
                this.requestGameStart();
                break;
        }
    };

    handleRequestInit(payload: any) {
        this.userInfo = payload.userInfo;
        this.gameInfo = payload.gameInfo;
        if (this.gameInfo?.permissionList.some(p => p.identity === this.userInfo?.preferred_username)) {
            this.requestGameStart();
        }
    }

    handleRequestParam(requestData: any) {
        if (requestData.requestName === "startGame") {
            this.postMessage({
                type: "clientGameUpdate",
                payload: { mainPicture: requestData.value }
            });
        }
    }

    postMessage = (message: Message) => {
        const messageStr = JSON.stringify(message);
        if (window.parent !== window) {
            console.info("PHASER(win) postMessage:", messageStr);
            window.parent.postMessage(messageStr, "*");
        } else if (window.ReactNativeWebView) {
            console.info("PHASER(native) postMessage:", messageStr);
            window.ReactNativeWebView.postMessage(messageStr);
        }
    };

    requestGameStart() {
        this.postMessage({
            type: "requestParam",
            payload: {
                requestName: "startGame",
                requestLocalization: "Please select a picture for the game.",
                type: "string"
            }
        });
    }

    requestUserInfo() {
        this.postMessage({ type: "requestInit", payload: null });
    }

    initGame(mainPicture: string) {
        if (!mainPicture) mainPicture = "Pic_elephant";
        
        this.gameState = {
            currentState: "WaitingState",
            gameMode: "multiplayer",
            difficulty: "medium",
            mainPicture: {
                key: "Pic_elephant",
                scale: 0.6,
                position: { x: this.scale.width / 2, y: this.scale.height / 3.5 }
            },
            shadows: this.generateShadows(), // Ensure this method returns the correct shadows
            correctShadow: "shadow_elephant_t", // Explicitly set the correct shadow
            guessedShadow: null,
            playerWrongCount: 0,
            playerMaxWrong: 3,
            timeRemaining: 60,
            totalTime: 60,
            timerStatus: "stopped",
            currentLevel: 1,
            currentPlayer: { id: "", mousePosition: { x: 0, y: 0 } },
            connectedPlayers: []
        };
    
        this.addMainPicture();
        this.setupShadowInteractions(); // Call this after setting up game state
        this.postMessage({
            type: "clientGameUpdate",
            payload: this.gameState
        });
    }

    generateShadows() {
        return [
            { texture: "shadow_elephant_f_1", position: { x: 200, y: 800 }, isCorrect: false, isHovered: false, isSelected: false },
            { texture: "shadow_elephant_f_2", position: { x: 700, y: 800 }, isCorrect: false, isHovered: false, isSelected: false },
            { texture: "shadow_elephant_t", position: { x: 1200, y: 800 }, isCorrect: true, isHovered: false, isSelected: false },
            { texture: "shadow_elephant_f_3", position: { x: 1700, y: 800 }, isCorrect: false, isHovered: false, isSelected: false }
        ];
    }

    addMainPicture() {
        const picConfig = this.gameState?.mainPicture;
        if (!picConfig) return;
        this.add.image(picConfig.position.x, picConfig.position.y, picConfig.key).setScale(picConfig.scale);
    }

    updateState(newState: GameStateContent) {
        if (!newState) return;
        const oldState = this.gameState;
        this.gameState = newState;
        if (oldState?.mainPicture.key !== newState.mainPicture.key) {
            this.initGame(newState.mainPicture.key);
        }
        this.refreshUI();
    }

    setupShadowInteractions() {
        console.log("Setup Shadow Interactions - Start");
        console.log("Current Shadows:", this.gameState?.shadows);
    
        // Prevent multiple setups
        if (this.shadowContainer) {
            this.shadowContainer.destroy();
        }
        
        // Create a new shadow container
        this.shadowContainer = new ShadowContainer(this, 0, 0);
    
        // Ensure gameState and shadows exist
        if (!this.gameState || !this.gameState.shadows) {
            console.error("Game state or shadows are undefined");
            return;
        }
    
        // Unique shadow setup to prevent duplicates
        const uniqueShadows = this.gameState.shadows.filter(
            (shadowData, index, self) => 
                index === self.findIndex((t) => t.texture === shadowData.texture)
        );
    
        console.log("Unique Shadows:", uniqueShadows);
    
        uniqueShadows.forEach(shadowData => {
            console.log("Setting up unique shadow:", shadowData.texture);
            const shadow = new Shadow(
                this, 
                shadowData.position.x, 
                shadowData.position.y, 
                shadowData.texture, 
                shadowData.isCorrect
            );
    
            // Add shadow to the container
            this.shadowContainer.addShadow(shadow);
        });
    
        // Add the shadow container to the scene
        this.add.existing(this.shadowContainer);
    
        console.log("Setup Shadow Interactions - Complete");
    }

    guessShadow(texture: string) {
        if (!this.gameState || this.gameState.currentState !== "WaitingState") return;

        const isCorrect = this.isGuessCorrect(texture);
        this.gameState = {
            ...this.gameState,
            guessedShadow: texture,
            playerWrongCount: isCorrect ? this.gameState.playerWrongCount : this.gameState.playerWrongCount + 1,
            currentState: isCorrect ? "WaitingState" : "GuessState"
        };

        this.postMessage({
            type: "clientGameUpdate",
            payload: this.gameState
        });

        isCorrect ? this.showRightStateUI() : this.showWrongStateUI();
    }

    isGuessCorrect(texture: string): boolean {
        console.log("Checking texture:", texture);
        console.log("Correct shadow:", this.gameState?.correctShadow);
        return texture === this.gameState?.correctShadow;
    }

    refreshUI() {
        if (!this.gameState) return;
        switch (this.gameState.currentState) {
            case "WaitingState":
                break;
            case "GuessState":
                this.handleGuessState();
                break;
            case "GameOverState":
                this.showGameOverUI();
                break;
        }
    }

    handleGuessState() {
        const isCorrect = this.isGuessCorrect(this.gameState?.guessedShadow || "");
        isCorrect ? this.showRightStateUI() : this.showWrongStateUI();
    }

    createText(config: { x: number; y: number; text: string; fontSize: string; color: string; }): Phaser.GameObjects.Text {
        return this.add.text(config.x, config.y, config.text, {
            fontSize: config.fontSize,
            color: config.color
        }).setOrigin(0.5);
    }

    showRightStateUI() {
        this.createText({
            x: this.scale.width / 2,
            y: this.scale.height / 2,
            text: "Well done!",
            fontSize: "64px",
            color: "#00ff00"
        });
        this.time.delayedCall(2000, () => {
            this.gameState = {
                ...this.gameState!,
                currentState: "WaitingState",
                currentLevel: this.gameState!.currentLevel + 1
            };
            this.postMessage({
                type: "clientGameUpdate",
                payload: this.gameState
            });
        });
    }

    showWrongStateUI() {
        this.wrongText = this.createText({
            x: this.scale.width / 2,
            y: this.scale.height / 2,
            text: "Wrong! Try Again",
            fontSize: "48px",
            color: "#ff0000"
        });

        this.time.delayedCall(500, () => this.wrongText?.destroy());

        if (this.gameState!.playerWrongCount >= this.gameState!.playerMaxWrong) {
            this.gameState = { ...this.gameState!, currentState: "GameOverState" };
        } else {
            this.gameState = { ...this.gameState!, currentState: "WaitingState" };
        }

        this.postMessage({
            type: "clientGameUpdate",
            payload: this.gameState
        });
    }

    showGameOverUI() {
        this.children.removeAll();
        this.createText({
            x: this.scale.width / 2,
            y: this.scale.height / 2 - 50,
            text: "Game Over",
            fontSize: "64px",
            color: "#ff0000"
        });
        this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, "Retry", { fontSize: "32px", color: "#ffffff" })
            .setOrigin(0.5)
            .setInteractive()
            .on("pointerdown", () => this.initGame(this.gameState?.mainPicture.key || "Pic_elephant"));
    }

    handleShadowClick(texture: string) {
        console.log("Shadow clicked:", texture);
        console.log("Correct shadow:", this.gameState?.correctShadow);
    
        if (!this.gameState || this.gameState.currentState !== "WaitingState") {
            console.log("Game not in waiting state");
            return;
        }
    
        const isCorrect = this.isGuessCorrect(texture);
        console.log("Is guess correct:", isCorrect);
    
        this.gameState = {
            ...this.gameState,
            guessedShadow: texture,
            playerWrongCount: isCorrect ? this.gameState.playerWrongCount : this.gameState.playerWrongCount + 1,
            currentState: isCorrect ? "WaitingState" : 
                (this.gameState.playerWrongCount + 1 >= this.gameState.playerMaxWrong ? "GameOverState" : "GuessState")
        };
    
        this.postMessage({
            type: "clientGameUpdate",
            payload: this.gameState
        });
    
        isCorrect ? this.showRightStateUI() : this.showWrongStateUI();
    }
}