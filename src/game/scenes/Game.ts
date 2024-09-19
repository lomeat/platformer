import Phaser from "phaser";

interface Controls {
	W: Phaser.Input.Keyboard.Key;
	S: Phaser.Input.Keyboard.Key;
	A: Phaser.Input.Keyboard.Key;
	D: Phaser.Input.Keyboard.Key;
	R: Phaser.Input.Keyboard.Key;
}

interface Skill {
	value: number;
	level: number;
}

interface State {
	jump: Skill;
	speed: Skill;
	score: number;
	maxScore: number;
	player: {
		isRight: boolean;
		isDead: boolean;
	};
}

interface UI {
	jump: Phaser.GameObjects.Text;
	speed: Phaser.GameObjects.Text;
	star: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
	score: Phaser.GameObjects.Text;
	maxScore: Phaser.GameObjects.Text;
}

const skillsPrice = {
	jump: [2, 2, 4, 8, 12],
	speed: [4, 6, 10, 12, 16],
};

class Bullet extends Phaser.Physics.Arcade.Sprite {
	speed: number = 1000;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, "bomb");
		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.setCollideWorldBounds(true);
	}

	fire(x, y, targetX, targetY) {
		const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);

		this.setVelocity(
			Math.cos(angle) * this.speed,
			Math.sin(angle) * this.speed
		);
	}

	update() {
		if (this.body?.onWorldBounds) {
			this.destroy();
			console.log("bullet has destryed out the world");
		}
	}
}

export class Game extends Phaser.Scene {
	constructor() {
		super("Game");
	}

	player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
	cursors?: Controls;
	platforms: Phaser.Physics.Arcade.StaticGroup;
	stars: Phaser.Physics.Arcade.Group;
	bombs: Phaser.Physics.Arcade.Group;
	bullets: Phaser.Physics.Arcade.Group;
	ui: UI;

	state: State;

	init() {
		this.state = {
			jump: {
				value: 500,
				level: 1,
			},
			speed: {
				value: 100,
				level: 1,
			},
			score: 0,
			maxScore: 0,
			player: {
				isRight: true,
				isDead: false,
			},
		};
	}

	preload() {
		this.load.image("sky", "assets/sky.png");
		this.load.image("ground", "assets/platform.png");
		this.load.image("star", "assets/star.png");
		this.load.image("bomb", "assets/bomb.png");
		this.load.spritesheet("dude", "assets/dude.png", {
			frameWidth: 32,
			frameHeight: 48,
		});
	}

	create() {
		this.add.image(400, 300, "sky");

		this.platforms = this.physics.add.staticGroup();
		this.platforms.create(400, 568, "ground").setScale(2).refreshBody();
		this.platforms.create(600, 400, "ground");
		this.platforms.create(50, 250, "ground");
		this.platforms.create(750, 220, "ground");

		this.player = this.physics.add
			.sprite(100, 450, "dude")
			.setBounce(0.2)
			.setCollideWorldBounds(true);

		this.ui = {
			score: this.add.text(60, 560, `x${this.state.score}`, {
				fontSize: "32px",
				color: "#fff",
			}),
			maxScore: this.add
				.text(
					this.cameras.main.worldView.x + this.cameras.main.width / 2,
					this.cameras.main.worldView.y + this.cameras.main.height / 2,
					`Score: ${this.state.maxScore}`,
					{
						fontSize: "60px",
						color: "#fff",
						backgroundColor: "black",
					}
				)
				.setOrigin(0.5)
				.setVisible(this.state.player.isDead),
			star: this.physics.add
				.staticSprite(30, 570, "star")
				.setTint(0xff0000)
				.setScale(2)
				.setInteractive(),
			jump: this.buttonGenerator(
				200,
				540,
				`Jump: ${this.state.jump.level} (${
					skillsPrice.jump[this.state.jump.level - 1]
				})`,
				() => this.upgradeClick("jump"),
				this
			),
			speed: this.buttonGenerator(
				200,
				570,
				`Speed: ${this.state.speed.level} (${
					skillsPrice.speed[this.state.speed.level - 1]
				})`,
				() => this.upgradeClick("speed"),
				this
			),
		};

		this.anims.create({
			key: "left",
			frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
			frameRate: 10,
			repeat: -1,
		});

		this.anims.create({
			key: "turn",
			frames: [{ key: "dude", frame: 4 }],
			frameRate: 20,
		});

		this.anims.create({
			key: "right",
			frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
			frameRate: 10,
			repeat: -1,
		});

		this.cursors = this.input.keyboard?.addKeys("W, S, A, D, R") as Controls;

		this.stars = this.physics.add.group({
			key: "star",
			repeat: 11,
			setXY: { x: 12, y: 0, stepX: 70 },
		});

		this.stars.children.iterate((child) => {
			(child as Phaser.Physics.Arcade.Sprite).setBounceY(
				Phaser.Math.FloatBetween(0.4, 0.8)
			);
			return null;
		});

		this.physics.add.collider(this.player, this.platforms);
		this.physics.add.collider(this.stars, this.platforms);

		this.physics.add.overlap(
			this.player,
			this.stars,
			this.collectStar,
			undefined,
			this
		);

		this.bombs = this.physics.add.group();

		this.bullets = this.physics.add.group({
			classType: Bullet,
			runChildUpdate: true,
		});

		this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			this.playerShoot(pointer.worldX, pointer.worldY);
		});

		this.physics.add.collider(this.platforms, this.bombs);
		this.physics.add.collider(
			this.player,
			this.bombs,
			this.hitBomb,
			undefined,
			this
		);

		this.physics.add.collider(this.bullets, this.bombs, this.shootBomb);

		this.physics.add.collider(this.bullets, this.platforms, (bullet, _) =>
			bullet.destroy()
		);
	}

	shootBomb(bullet, bomb) {
		bomb.body.destroy();
		bomb.body.disable();
	}

	playerShoot(x: number, y: number) {
		const bullet = this.bullets.get(this.player.x, this.player.y);

		if (bullet) {
			bullet.fire(this.player.x, this.player.y, x, y);

			this.time.delayedCall(2000, () => {
				bullet.destroy();
			});
		}
	}

	private buttonGenerator(x, y, text, callback, context = this) {
		const a = this.add
			.text(x, y, text, {
				fontSize: "20px",
				color: "#ffffff",
				backgroundColor: "#0000ff",
				padding: { left: 10, right: 10, top: 5, bottom: 5 },
			})
			.setInteractive()
			.on("pointerover", () => {
				a.setStyle({ backgroundColor: "#ff0000" });
			})
			.on("pointerout", () => {
				a.setStyle({ backgroundColor: "#0000ff" });
			})
			.on("pointerdown", () => {
				callback.call(context);
			});
		return a;
	}

	upgradeClick(key: "jump" | "speed") {
		const newScore =
			this.state.score - skillsPrice[key][this.state[key].level - 1];
		const maxLevel = skillsPrice[key].length;

		if (newScore >= 0 && this.state[key].level <= maxLevel) {
			this.state.score -= skillsPrice[key][this.state[key].level - 1];
			this.state[key].level += 1;
			this.state[key].value += 100;
			this.ui.score.setText(`x${this.state.score}`);
			this.ui[key].setText(
				`${key.toUpperCase()}: ${this.state[key].level} (${
					skillsPrice[key][this.state[key].level - 1]
				})`
			);
		}
	}

	hitBomb(player, bomb) {
		this.physics.pause();
		this.state.player.isDead = true;
	}

	collectStar(player, star) {
		star.disableBody(true, true);
		this.state.score += 1;
		this.state.maxScore += 1;
		this.ui.score.setText(`x${this.state.score}`);

		if (this.stars.countActive() === 0) {
			this.stars.children.iterate((child) => {
				if (child instanceof Phaser.Physics.Arcade.Sprite) {
					child.enableBody(true, child.x, 0, true, true);
				}
				return null;
			});

			const bombX =
				this.player.x < 400
					? Phaser.Math.Between(400, 800)
					: Phaser.Math.Between(0, 400);
			const bomb = this.bombs.create(
				bombX,
				16,
				"bomb"
			) as Phaser.Physics.Arcade.Sprite;
			bomb.setBounce(1);
			bomb.setCollideWorldBounds(true);
			bomb.setVelocity(Phaser.Math.Between(-300, 300), 20);
		}
	}

	update() {
		if (this.cursors?.A.isDown) {
			this.player.setVelocityX(-this.state.speed.value);
			this.player.anims.play("left", true);
			this.state.player.isRight = false;
		} else if (this.cursors?.D.isDown) {
			this.player.setVelocityX(this.state.speed.value);
			this.player.anims.play("right", true);
			this.state.player.isRight = true;
		} else {
			this.player.setVelocityX(0);
			this.player.anims.play("turn");
		}

		if (this.cursors?.R.isDown) {
			this.scene.restart();
		}

		if (this.state.player.isDead) {
			this.player.anims.stop();
			this.player.setTint(0x000000);
			this.ui.maxScore.setVisible(true);
		}

		if (this.cursors?.W.isDown && this.player.body.touching.down) {
			this.player.setVelocityY(-this.state.jump.value);
		}
	}
}
