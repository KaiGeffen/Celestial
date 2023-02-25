import 'phaser'
import jwt_decode from "jwt-decode"
import Loader from '../loader/loader'
import Server from '../server'
import { Color, Mobile, Space, Style, Url, UserProgress, UserSettings } from '../settings/settings'
import Button from "../lib/buttons/button"
import Buttons from "../lib/buttons/buttons"


// Scene for user to select a sign in option, without loading assets
export class SigninScene extends Phaser.Scene {
	// True when user is signed or chose to be a guest
	signedInOrGuest: boolean = false
	guestButton: Button

	constructor(args) {
		super({
			key: args === undefined ? 'SigninScene' : args.key
		})
	}

	create(): void {
		document.getElementById("signin").hidden = false

		// Ensure user is signed out
		UserSettings.clearSessionStorage()

		// Add buttons to sign in or play as a guest
		this.createButtons()
	}

	// Create buttons for each of the signin options (Guest, OAuth)
	private createButtons(): void {
		const x = Space.windowWidth/2
		const y = Space.windowHeight/2
		
		this.guestButton = new Buttons.Basic(this, x, y, 'Guest', () => {
			// Ensure that any other automatic sign-ins are cancelled
			google.accounts.id.cancel()

			this.onOptionClick()
		})

		// Google GIS
		this.createGoogleGSIButton(y - 100)

		// Facebook signin
		this.createFacebookButton(y - 200)
	}

	private onOptionClick(): void {
		this.signedInOrGuest = true

		// Make the buttons unclickable
		this.guestButton.disable()

		// If the core assets have been loaded, start home scene
		if (Loader.postLoadStarted) {
			this.scene.start('HomeScene')
		}
	}

	private createGoogleGSIButton(y: number): void {
		// const client = google.accounts['oauth2'].initTokenClient({
		// 	client_id: Url.oauth,
		// 	scope: 'https://www.googleapis.com/auth/userinfo.email',
		// 	callback: (tokenResponse) => {
		// 		console.log('This is google authorization response:')
		// 		console.log(tokenResponse)

		// 		Server.login(tokenResponse.access_token, this)

		// 		this.onOptionClick()

		// 	},
		// })

		google.accounts.id.initialize({
			client_id: Url.oauth,
			log_level: 'debug',
			auto_select: true,

			// login_uri: 'https://celestialtcg.com/gapi',
			
			callback: (token) => {
				console.log('Signin succesful')

				// TODO Type definitions
				// google.accounts['oauth2'].initTokenClient({
				// 	client_id: Url.oauth,
				// 	scope: 'https://www.googleapis.com/auth/userinfo.email',
				// 	callback: (tokenResponse) => {
				// 		console.log('This is google authorization response:')
				// 		console.log(tokenResponse)

				// 		Server.login(tokenResponse.access_token, this)

				// 		this.onOptionClick()

				// 	},
				// })

				const payload: any = jwt_decode(token.credential)
				console.log(payload)

				// Send the jti to confirm a connection
				Server.login(payload, this.game)

				this.onOptionClick()
			}
		})

		// NOTE Ensure that one-tap appears even if the user has closed it in the past
		document.cookie = `g_state=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT`
		
		google.accounts.id.prompt()

	    // Render the button as the right element
		// google.accounts.id.renderButton(
		// 	document.getElementById("signin_google"),
		// 	{
		// 		type: "standard",
		// 		theme: "outline",
		// 		size: "large",
		// 		width: 220,
		// 	},
		// )

		// Center the sign in button
		// document.getElementById("signin_google").style.transform = 'translate(-50%, -50%)'
	}

	private createFacebookButton(y: number): void {
		// Window asynch initiates and then checks the login status
		window.fbAsyncInit = function() {
			FB.init({
				appId      : '525279936367652',
				cookie     : true,                     // Enable cookies to allow the server to access the session.
				xfbml      : true,                     // Parse social plugins on this webpage.
				version    : 'v16.0'		           // Use this Graph API version for this call.
			})

			FB.getLoginStatus(function(response) {   // Called after the JS SDK has been initialized.
				console.log('statusChangeCallback')
    			console.log(response)

    			if (response.status === 'connected') {
    				Server.login(response.authResponse.accessToken, this.game)
    			}

    			FB.api('/me', function(response: any) {
    				console.log('Successful login for: ' + response.name);
    			})
			})
		}
	}

}

export class PreloadScene extends SigninScene {
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

		super.create()
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

			Server.login(token, that.game)
		}

		function onFailure(): void {
			// TODO Add some behavior
			console.log('Failed to signin')
		}

		// Render login button
		gapi.signin2.render("signin", {
			// longtitle: true,
			width: Space.buttonWidth,
			height: Space.buttonHeight,
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
}