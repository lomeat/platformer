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
}

interface UI {
	jump: Phaser.GameObjects.Text;
	speed: Phaser.GameObjects.Text;
	star: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
	score: Phaser.GameObjects.Text;
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

	ui: UI;

	state: State = {
		jump: {
			value: 500,
			level: 1,
		},
		speed: {
			value: 100,
			level: 1,
		},
		score: 0,
	};

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
		this.add.image(0, 0, "sky").setOrigin(0, 0);

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
			star: this.physics.add
				.staticSprite(30, 570, "star")
				.setTint(0xff0000)
				.setScale(2)
				.setInteractive(),
			jump: this.buttonGenerator(
				200,
				540,
				`Jump: ${this.state.jump.level}`,
				this.jumpButtonClick,
				this
			),
			speed: this.buttonGenerator(
				200,
				570,
				`Speed: ${this.state.speed.level}`,
				this.speedButtonClick,
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

		this.physics.add.collider(this.platforms, this.bombs);
		this.physics.add.collider(
			this.player,
			this.bombs,
			this.hitBomb,
			undefined,
			this
		);
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

	jumpButtonClick() {
		if (this.state.score - 2 >= 0) {
			this.state.score -= 2;
			this.state.jump.level += 1;
			this.state.jump.value += 100;
			this.ui.score.setText(`x${this.state.score}`);
			this.ui.jump.setText(`Jump: ${this.state.jump.level}`);
		}
	}

	speedButtonClick() {
		if (this.state.score - 4 >= 0) {
			this.state.score -= 4;
			this.state.speed.level += 1;
			this.state.speed.value += 100;
			this.ui.score.setText(`x${this.state.score}`);
			this.ui.speed.setText(`Speed: ${this.state.speed.level}`);
		}
	}

	hitBomb(player, bomb) {
		this.physics.pause();
		player.setTint(0x000000);
		player.anims.play("turn");
	}

	collectStar(player, star) {
		star.disableBody(true, true);
		this.state.score += 1;
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
		} else if (this.cursors?.D.isDown) {
			this.player.setVelocityX(this.state.speed.value);
			this.player.anims.play("right", true);
		} else {
			this.player.setVelocityX(0);
			this.player.anims.play("turn");
		}

		if (this.cursors?.R.isDown) {
			this.scene.restart();
		}

		if (this.cursors?.W.isDown && this.player.body.touching.down) {
			this.player.setVelocityY(-this.state.jump.value);
		}
	}
}
