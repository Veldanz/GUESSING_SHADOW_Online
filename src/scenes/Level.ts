import Phaser from "phaser";
import ShadowContainer from "../prefabs/ShadowContainer";
import Shadow from "../prefabs/Shadow";
import { GameStateContent, GameInfo, UserInformation } from "~/data/gameState";
import { io, Socket } from 'socket.io-client';
export default class Level extends Phaser.Scene {

    private socket: Socket;

	constructor() {
		super("Level");
	}

    editorCreate(): void {
        const key_start_debug = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
        this.key_start_debug = key_start_debug;
        this.add.image(this.scale.width / 2, this.scale.height / 2, "BG");
        this.add.image(this.scale.width / 2, this.scale.height / 2, "GRASS");
        this.add.image(this.scale.width / 2, this.scale.height / 2, "Shadow_Panel");
        this.events.emit("scene-awake");
    }
    
    private shadowContainer!: ShadowContainer;
    private wrongText: Phaser.GameObjects.Text | null = null;

    gameInfo: GameInfo | undefined;
    gameState: GameStateContent | undefined;
    userInfo: UserInformation | undefined;
    private key_start_debug!: Phaser.Input.Keyboard.Key;

    create() {
        this.editorCreate();

        window.addEventListener('message', this.handleMessage);

        this.key_start_debug.on('down', () => {
            this.initGame('debug');
        });

                this.socket = io('http://localhost:3000', {
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000
                });
        
                this.socket.on('connect', () => {
                    console.log('Socket connected with ID:', this.socket.id);
                    
                    this.joinRoom();
                });
        
                this.socket.on('serverGameUpdate', (gameState) => {
                    this.updateState(gameState);
                });

        this.requestUserInfo();
        window.addEventListener('message', this.handleMessage);
    }

    joinRoom() {
        const roomName = this.userInfo?.preferred_username || 'defaultGameRoom';
        
        this.socket.emit('joinRoom', roomName);
    }

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
        this.postMessage({
            type: "requestInit",
            payload: null,
        });
    }

    handleMessage = (event: MessageEvent) => {
        console.info('PHASER handleMessage:', JSON.stringify(event.data));

        switch(event.data.type) {
            case "requestInit": {
                this.userInfo = event.data.payload.userInfo;
                this.gameInfo = event.data.payload.gameInfo;

                var permission = this.gameInfo?.permissionList.find(p => p.identity == this.userInfo?.preferred_username);
                if (permission) this.requestGameStart();
            }
            break;

            case "serverGameUpdate": {
                this.updateState(event.data.payload);
            }
            break;

            case "requestParam": {
                var requestData = event.data.payload;
                switch(requestData.requestName) {
                    case "startGame": 
                    this.postMessage({
                        type: "clientGameUpdate",
                        payload: {
                            shadowanswer: requestData.value,
                        }
                    });
                    break;
                }
            }
            break;

            case "requestGame": {
                this.requestGameStart();
            }
            break;
        }
    };

    postMessage = (message: Message) => {
        if (message.type === 'clientGameUpdate') {
            this.socket.emit('clientGameUpdate', message.payload);
        } else {
            if (window.parent !== window) {
                window.parent.postMessage(message, '*');
            }
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(message));
            }
        }

        console.log('Sent to server');
    }

    guessShadow(texture: string) {
        try {
            if (!this.gameState || this.gameState.currentState !== "WaitingState") return;

            const isCorrect = this.isGuessCorrect(texture);
            const updatedGameState = {
                ...this.gameState,
                guessedShadow: texture,
                playerWrongCount: isCorrect ? this.gameState.playerWrongCount : this.gameState.playerWrongCount + 1,
                currentState: isCorrect ? "WaitingState" : "GuessState"
            };

            this.socket.emit('clientGameUpdate', updatedGameState);

            isCorrect ? this.showRightStateUI() : this.showWrongStateUI();
        }
        catch(e) {
            console.error(`${e}`);
        }
    }

    initGame(mainPicture: string) {

        if (this.gameState?.currentState === "WaitingState") {
            console.warn("Game already initialized.");
            return;
        }

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
            shadows: this.generateShadows(),
            correctShadow: "shadow_elephant_t",
            guessedShadow: null,
            playerWrongCount: 0,
            playerMaxWrong: 3,
            timeRemaining: 60,
            totalTime: 60,
            timerStatus: "stopped",
            currentLevel: 1,
            currentPlayer: { id: "", mousePosition: { x: 0, y: 0 } },
            connectedPlayers: [],

            shadowAnswer: 'shadow_elephant_t',  
            guessShadow: [],
        };
    
        this.addMainPicture();
        this.setupShadowInteractions();
        this.postMessage({
            type: "clientGameUpdate",
            payload: this.gameState,
        });
    }

    updateState(newState : any) {
        if (!newState) return;
    
        var oldState = undefined;
        if (this.gameState) oldState = this.gameState;
        this.gameState = newState;
    
        console.info(`PHASER currentState: ${JSON.stringify(this.gameState)}`);
        if (this.gameState && oldState?.shadowAnswer != this.gameState?.shadowAnswer) {
            this.initGame(this.gameState!.shadowAnswer);
        }
    
        this.gameState?.guessShadow.forEach(guessShadow => {
            this.guessShadow(guessShadow);
        });
    }

    isGuessCorrect(texture: string): boolean {
        console.log("Checking texture:", texture);
        console.log("Correct shadow:", this.gameState?.correctShadow);
        return texture === this.gameState?.correctShadow;
    }

    addMainPicture() {
        const picConfig = this.gameState?.mainPicture;
        if (!picConfig) return;
        this.add.image(picConfig.position.x, picConfig.position.y, picConfig.key).setScale(picConfig.scale);
    }

    generateShadows() {
        return [
            { texture: "shadow_elephant_f_1", position: { x: 200, y: 800 }, isCorrect: false, isHovered: false, isSelected: false },
            { texture: "shadow_elephant_f_2", position: { x: 700, y: 800 }, isCorrect: false, isHovered: false, isSelected: false },
            { texture: "shadow_elephant_t", position: { x: 1200, y: 800 }, isCorrect: true, isHovered: false, isSelected: false },
            { texture: "shadow_elephant_f_3", position: { x: 1700, y: 800 }, isCorrect: false, isHovered: false, isSelected: false }
        ];
    }

    setupShadowInteractions() {
        console.log("Setup Shadow Interactions - Start");
        
        if (this.shadowContainer) {
            this.shadowContainer.destroy();
        }
        
        this.shadowContainer = new ShadowContainer(this, 0, 0);
    
        if (!this.gameState || !this.gameState.shadows) {
            console.error("Game state or shadows are undefined");
            return;
        }
    
        const uniqueShadows = this.gameState.shadows.filter(
            (shadowData, index, self) => 
                index === self.findIndex((t) => t.texture === shadowData.texture)
        );
    
        uniqueShadows.forEach(shadowData => {
            const shadow = new Shadow(
                this, 
                shadowData.position.x, 
                shadowData.position.y, 
                shadowData.texture, 
                shadowData.isCorrect
            );
    
            this.shadowContainer.addShadow(shadow);
        });
    
        this.add.existing(this.shadowContainer);
    
        console.log("Setup Shadow Interactions - Complete");
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

    createText(config: { x: number; y: number; text: string; fontSize: string; color: string; }): Phaser.GameObjects.Text {
        return this.add.text(config.x, config.y, config.text, {
            fontSize: config.fontSize,
            color: config.color
        }).setOrigin(0.5);
    }

    handleShadowClick(texture: string) {
        // Check if the game is in right state or not.
        if (!this.gameState || this.gameState.currentState !== "WaitingState") return;
    
        const shadowToGuess = this.gameState.shadows.find(shadow => shadow.texture === texture);
        if (!shadowToGuess) return;
    
        if (this.gameState.guessShadow.includes(texture)) {
            console.log("This shadow has already been guessed");
            return;
        }
    
        const updatedShadows = this.gameState.shadows.map(shadow => 
            shadow.texture === texture 
                ? { ...shadow, isSelected: true, isHovered: false }
                : shadow
        );
    
        const updatedGuessShadows = [...(this.gameState.guessShadow || []), texture];
    
        const isCorrect = this.isGuessCorrect(texture);
    
        this.gameState = {
            ...this.gameState,
            shadows: updatedShadows,
            guessedShadow: texture,
            guessShadow: updatedGuessShadows,
            playerWrongCount: isCorrect ? this.gameState.playerWrongCount : this.gameState.playerWrongCount + 1,
            currentState: isCorrect ? "WaitingState" : (
                this.gameState.playerWrongCount + 1 >= this.gameState.playerMaxWrong 
                ? "GameOverState" 
                : "GuessState"
            )
        };
    
        const shadowContainer = this.shadowContainer;
        if (shadowContainer) {
            const shadowObject = shadowContainer.getShadowByTexture(texture);
            if (shadowObject) {
                shadowObject.setAlpha(0.5);
                shadowObject.setInteractive(false);
            }
        }
    
        this.postMessage({
            type: "clientGameUpdate",
            payload: this.gameState
        });
    
        isCorrect ? this.showRightStateUI() : this.showWrongStateUI();
    }

}