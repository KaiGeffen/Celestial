import 'phaser'
import jwt_decode from "jwt-decode"

import Loader from '../loader/loader'
import Server from '../server'
import { Color, Mobile, Space, Style, Url, UserProgress, UserSettings } from '../settings/settings'
import Buttons from "../lib/buttons/buttons"


export default class PreloadClass extends Phaser.Scene {
	// True when user is signed or chose to be a guest
	signedInOrGuest: boolean = false

	constructor() {
		super({
			key: "PreloadScene"
		})
	}

	// Load all assets used throughout the game
	preload(): void {
		// Ensure that every user setting is either set, or set it to its default value
		UserSettings._ensure()

		// Ensure that audio plays even when tab loses focus
		this.sound.pauseOnBlur = false

		this.sound.volume = UserSettings._get('volume')

		// Load the assets used in this scene
		Loader.preload(this)
	}

	create() {
		// TODO Replace with Google GIS button as an option below
		// this.renderSigninButton()

		// Gain access to chart plugin
		this.load.script('chartjs', 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.8.0/chart.min.js')

		// Load all assets used throughout the game
		// Create the graphics for how much of loading is complete and their listeners
		this.createProgressGraphics()

		// NOTE This does not block and these assets cannot won't be loaded in time for below code
		Loader.loadAll(this)

		// Add buttons to sign in or play as a guest
		this.createButtons()
	}

	private createGoogleGSIButton(y: number): void {

		console.log(google)

		google.accounts.id.initialize({
      		client_id: Url.oauth,
      		callback: (token) => {
      			console.log('Signin succesful')

				// // Communicate with server, load data on response
				// let token = user.getAuthResponse().id_token
				const decoded: any  = jwt_decode(token.credential)
				console.log(decoded)
				const payload = decoded.payload

				Server.login(payload.sub, this)

				// TODO Make dry with below button callback
				this.signedInOrGuest = true

				// If the core assets have been loaded, start home scene
				if (Loader.postLoadStarted) {
					this.scene.start('HomeScene')
				}
      		}
	    })
	    const pageElement = document.getElementById("signin")

	    // Render the button as the right element
	    google.accounts.id.renderButton(
            pageElement,
            {
            	theme: "outline",
            	size: "large",
            	shape: "pill",
            	width: Space.smallButtonWidth,
            },
	    )

	    // Move that element to the correct location
	    // pageElement.style.verticalAlign = 'middle'
	    // pageElement.style.align = 'middle'
	    pageElement.style.top = `${y}px`
	    pageElement.style.left = '50%'
	    pageElement.style.transform = 'translate(-50%, -50%)'
	}

	renderSigninButton(): void {
		let that = this

		// If in dev environment, don't render the button
		if (location.port === '4949') {
			return
		}
		
		// Initialize Google Auth
		gapi.load('auth2', function() {
			gapi.auth2.init({
				client_id: Url.oauth
			})
		})

		function onSuccess(user: gapi.auth2.GoogleUser): void {
			console.log('Signin succesful')

			// Communicate with server, load data on response
			let token = user.getAuthResponse().id_token

			Server.login(token, that)
		}

		function onFailure(): void {
			// TODO Add some behavior
			console.log('Failed to signin')
		}

		// Render login button
		gapi.signin2.render("signin", {
			// longtitle: true,
			width: Space.smallButtonWidth,
			height: Space.smallButtonHeight,
			onsuccess: onSuccess,
			onfailure: onFailure
		})
	}

	// Create the which show user how much has loaded
	private createProgressGraphics(): void {
		let width = 800
		let height = 100
		let x = (Space.windowWidth - width)/2
		let y = Space.windowHeight - height/2 - 200

		// Add graphics to show information
		let progressBox = this.add.graphics()
		.fillStyle(Color.progressBackground)
		.fillRect(x, y, width, height)
		let progressBar = this.add.graphics()

		// Add text
		let txtLoading = this.make.text({
			x: x + width/2,
			y: y + height/2,
			text: 'Loading...',
			style: Style.announcement
		}).setOrigin(0.5)

		// Update the progress bar
		this.load.on('progress', function (value) {
			if (!Loader.postLoadStarted) {
				progressBar.clear()
				progressBar.fillStyle(Color.progressFill, 1)
				progressBar.fillRect(
					x + Space.pad,
					y + Space.pad,
					(width - Space.pad*2) * value,
					height - Space.pad*2
					)
			}
		})

		this.load.on('complete', () => {
			// Only do this the first time load completes
			if (!Loader.postLoadStarted) {
				Loader.loadAnimations(this)
				Loader.postLoad(this)

				txtLoading.setText('Loaded')

				// If user has already signed in, start home scene
				if (this.signedInOrGuest) {
					this.scene.start('HomeScene')
				}
			}
			// When the post load completes, set a flag
			else if (!Loader.postLoadComplete) {
				Loader.postLoadComplete = true
			}
		})
	}

	// Create buttons for each of the signin options (Guest, OAuth)
	private createButtons(): void {
		const x = Space.windowWidth/2
		const y = Space.windowHeight/2
		
		new Buttons.Basic(this, x, y, 'Guest', () => {
			this.signedInOrGuest = true

			// If the core assets have been loaded, start home scene
			if (Loader.postLoadStarted) {
				this.scene.start('HomeScene')
			}
		})

		// Google GIS
		this.createGoogleGSIButton(y - 100)

	}
}