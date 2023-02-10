import "phaser";
import RoundRectangle from 'phaser3-rex-plugins/plugins/roundrectangle.js';
import Button from '../../lib/buttons/button';
import Icons from '../../lib/buttons/icons'
import ClientState from '../../lib/clientState';
import { Style, Color, Space, Time, Ease } from '../../settings/settings';
import BaseScene from '../baseScene';
import Region from './baseRegion';


// During the round, shows Pass button, who has passed, and who has priority
export default class PassRegion extends Region {
	callback: () => void
	recapCallback: () => void
	
	// The callback once the winner has been declared
	showResultsCallback: () => void

	btnPass: Button
	btnMoon: Button

	txtYouPassed: Phaser.GameObjects.Text
	txtTheyPassed: Phaser.GameObjects.Text

	create (scene: BaseScene): PassRegion {
		this.scene = scene
		this.container = scene.add.container(Space.windowWidth, Space.windowHeight/2)

		// Pass and recap button
		this.createButtons()

		// Text for who has passed
		this.createText()

		return this
	}

	displayState(state: ClientState, isRecap: boolean): void {
		this.deleteTemp()

		// Before mulligan is complete, hide this region
		if (state.mulligansComplete.includes(false)) {
			this.container.setVisible(false)
			return
		}
		this.container.setVisible(true)


		// Display the current score totals
		const s = `${state.score[1]}\n\n${state.score[0]}`
		this.btnMoon.setText(s)

		// Once the game is over, change the callback to instead show results of match
		if (state.winner !== null) {
			this.btnPass.setOnClick(() => {	
				this.showResultsCallback()
			})
		}

		// Rotate to the right day/night
		this.showDayNight(isRecap)

		// Show who has passed
		if (state.passes === 2) {
			this.animatePass(this.txtYouPassed, true)
			this.animatePass(this.txtTheyPassed, true)
		}
		else if (state.passes === 1) {
			// My turn, so they passed
			if (state.priority === 0) {
				this.animatePass(this.txtYouPassed, false)
				this.animatePass(this.txtTheyPassed, true)
			}
			// Their turn, so I passed
			else {
				this.animatePass(this.txtYouPassed, true)
				this.animatePass(this.txtTheyPassed, false)
			}
		}
		else {
			this.animatePass(this.txtYouPassed, false)
			this.animatePass(this.txtTheyPassed, false)
		}

		// Enable/disable button based on who has priority
		if (state.winner !== null) {
			this.btnPass.enable()

			// This displays the correct alternate text
			this.btnPass.setText('EXIT')
		}
		else if (state.priority === 0 && !isRecap) {
			this.btnPass.enable()
		}
		else {
			this.btnPass.disable()
		}

		// Disable moon during day
		if (isRecap) {
			this.btnMoon.enable()
		}
		else {
			this.btnMoon.disable()
		}
	}

	// Set the callback for when user hits the Pass button
	setCallback(callback: () => void): void {
		this.callback = callback
	}

	setShowResultsCallback(callback: () => void): void {
		this.showResultsCallback = callback
	}

	private createButtons(): void {
		let that = this

		this.btnPass = new Icons.Pass(this.container, -156, 0)
		this.btnMoon = new Icons.Moon(this.container, 156, 0, () => {
			if (this.scene['paused']) {
				this.scene['paused'] = false
				this.btnMoon.setText(this.btnMoon.txt.text.replace('\nPaused\n', '\n\n'))
			}
			else {
				this.scene['paused'] = true
				this.btnMoon.setText(this.btnMoon.txt.text.replace('\n\n', '\nPaused\n'))
			}
		})
		
		// Set on click to be the callback, but only once
		this.btnPass.setOnClick(() => {that.callback()}, true)
	}

	private createText(): void {
		this.txtYouPassed = this.scene.add.text(
			-150,
			120,
			'You Passed',
			Style.basic,
			).setOrigin(0.5)

		this.txtTheyPassed = this.scene.add.text(
			-150,
			-120,
			'They Passed',
			Style.basic,
			).setOrigin(0.5)

		this.container.add([
			this.txtYouPassed,
			this.txtTheyPassed
			])
	}

	// Animate the given object saying that the player has/not passed
	// NOTE This causes a pause on every state change even if alpha is 0 > 0
	private animatePass(txt: Phaser.GameObjects.Text, hasPassed: boolean): void {
		this.scene.tweens.add({
			targets: txt,
			alpha: hasPassed ? 1 : 0,
			duration: Time.recapTween(),
			
			onComplete: function (tween, targets, _)
			{
				txt.setAlpha(hasPassed ? 1 : 0)
			}
		})
	}

	// Animate the sun / moon being visible when it's day or night
	private showDayNight(isRecap: boolean) {
		let target = this.container

		if (!isRecap) {
			target.rotation += .001
		}

		// NOTE Target just below PI so that it doesn't flip to -PI and then rotate a full 2PI
		this.scene.tweens.add({
			targets: target,
			rotation: isRecap ? Math.PI - .001 : 0,
			ease: Ease.basic,
		})
	}

	// For tutorial, disable the option to pass, but still show the sun
	// private oldCallback: () => void
	tutorialDisablePass(): void {
		// this.btnPass.setAlpha(0)
		this.btnPass.setText('')
		.disable()
		['tutorialSimplifiedPass'] = true

		// Enable it, with simplified utility
		this.btnPass.enable()
		
		// this.btnPass.setAlpha(0)
		// this.oldCallback = this.btnPass.onClick
		// this.btnPass.setOnClick(() => {})
		// this.btnPass.txt.setFontSize(0)
	}

	tutorialEnablePass(): void {
		this.btnPass['tutorialSimplifiedPass'] = false
		this.btnPass.enable()
		// this.btnPass.setAlpha(1)
		// this.btnPass.setOnClick(this.oldCallback)
		// this.btnPass.txt.setFont(Style.pass.fontSize)
	}
}