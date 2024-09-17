import { useRef } from "react";
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame";

function App() {
	//  References to the PhaserGame component (game and scene are exposed)
	const phaserRef = useRef<IRefPhaserGame | null>(null);

	return (
		<div id="app" style={{ display: "flex", flexDirection: "column" }}>
			<PhaserGame ref={phaserRef} />
			<p>Controls: WASD</p>
			<p>R - restart</p>
			<p>Jump, speed buttons are clickable</p>
		</div>
	);
}

export default App;

