import "phaser";

export class GameScene extends Phaser.Scene {
  delta: number;
  lastStarTime: number;
  starsCaught: number;
  starsFallen: number;
  sand: Phaser.Physics.Arcade.StaticGroup;
  info: Phaser.GameObjects.Text;
  
  constructor() {
    super({
      key: "GameScene"
    });
  }
  
  init(/*params: any*/): void {
    this.delta = 1000;
    this.lastStarTime = 0;
    this.starsCaught = 0;
    this.starsFallen = 0;
  }

  preload(): void {
    this.load.setBaseURL(
      "https://raw.githubusercontent.com/KaiGeffen/" +
      "Celestial/master/images/");
    // this.load.svg("space", "https://raw.githubusercontent.com/game-icons/icons/master/lorc/ace.svg")
    // this.load.svg("sacorn", "https://raw.githubusercontent.com/game-icons/icons/master/lorc/acorn.svg")
    // this.load.setBaseURL(
    //   "https://raw.githubusercontent.com/game-icons/icons/");
      // "https://raw.githubusercontent.com/mariyadavydova/" +
      // "starfall-phaser3-typescript/master/");
    this.load.image("space", "AI.png");
    this.load.image("sacorn", "AI.png");
  }
  
  create(): void {
    this.sand = this.physics.add.staticGroup({
      key: "sacorn",
      frameQuantity: 20
    });
    Phaser.Actions.PlaceOnLine(this.sand.getChildren(),
      new Phaser.Geom.Line(20, 580, 820, 580));
    this.sand.refresh();
    this.info = this.add.text(10, 10, '');
  }

  update(time: number): void {
    var diff: number = time - this.lastStarTime;
    if (diff > this.delta) {
      this.lastStarTime = time;
      if (this.delta > 500) {
        this.delta -= 20;
      }
      this.emitStar();
    }
    this.info.text =
    this.starsCaught + " caught - " +
    this.starsFallen + " fallen (max 3)";
  }

  private onClick(star: Phaser.Physics.Arcade.Image): () => void {
    return function () {
      star.setTint(0x00ff00);
      star.setVelocity(0, 0);
      this.starsCaught += 1;
      this.time.delayedCall(100, function (star) {
        star.destroy();
      }, [star], this);
    }
  }
  
  private onFall(star: Phaser.Physics.Arcade.Image): () => void {
    return function () {
      star.setTint(0xff0000);
      this.starsFallen += 1;

      if (this.starsFallen >= 3) {
        this.scene.start("ScoreScene", 
          { starsCaught: this.starsCaught });
      }

      this.time.delayedCall(100, function (star) {
        star.destroy();
      }, [star], this);
    }
  }

  private emitStar(): void {
    var star: Phaser.Physics.Arcade.Image;
    var x = Phaser.Math.Between(25, 775);
    var y = 26;
    star = this.physics.add.image(x, y, "space");
    star.setDisplaySize(50, 50);
    star.setVelocity(0, 200);
    star.setInteractive();
    star.on('pointerdown', this.onClick(star), this);
    this.physics.add.collider(star, this.sand, 
      this.onFall(star), null, this);
  }

};