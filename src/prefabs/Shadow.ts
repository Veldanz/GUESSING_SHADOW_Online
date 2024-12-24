import Phaser from "phaser";

export default class Shadow extends Phaser.GameObjects.Image {
  setInteractiveState(isInteractive: boolean) {
    if (isInteractive) {
        this.setInteractive();
    } else {
        this.disableInteractive();
    }
  }
  private isCorrect: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, isCorrect: boolean) {
    super(scene, x, y, texture);
    this.isCorrect = isCorrect;

    // Add to the scene
    scene.add.existing(this);

    // Set default scale and size
    this.setScale(0.45);

    // Enable input interaction
    this.setInteractive();

    // Handle click interactions
    this.on("pointerdown", () => {
      // Pass the texture to the scene's handler
      if (scene instanceof Phaser.Scene) {
        const levelScene = scene as any;
        if (typeof levelScene.handleShadowClick === "function") {
          levelScene.handleShadowClick(this.texture.key); // Changed from this.isCorrect to this.texture.key
        } else {
          console.warn("handleShadowClick not found on the scene.");
        }
      }
    });
  }
}