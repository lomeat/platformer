import { Game as MainGame } from "./scenes/Game";
import { AUTO, Game, Types } from "phaser";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
	type: AUTO,
	width: 800,
	height: 600,
	parent: "game-container",
	backgroundColor: "#028af8",
	scene: [MainGame],
	physics: {
		default: "arcade",
		arcade: {
			gravity: { y: 1000, x: 0 },
			debug: false,
		},
	},
};

const StartGame = (parent: string) => {
	return new Game({ ...config, parent });
};

export default StartGame;
