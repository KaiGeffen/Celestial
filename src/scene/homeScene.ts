import "phaser"
import { Style, Color, Space, UserProgress, Url, UserSettings } from "../settings/settings"
import { allCards } from "../catalog/catalog"
import BaseScene from "./baseScene"
import Button from "../lib/buttons/button"
import Buttons from "../lib/buttons/buttons"
import Icons from "../lib/buttons/icons"
import Icon from "../lib/icon"
import Menu from "../lib/menu"
import intro from "../adventures/intro.json"


export default class HomeScene extends BaseScene {

  constructor() {
    super({
      key: "HomeScene"
    })
  }

  create(): void {
    let that = this

    // Show the login button
    document.getElementById("signin").hidden = false

    // Display text and button
    this.add.text(Space.windowWidth/2, Space.windowHeight/2 - 150, "Celestial",
      Style.title).setOrigin(0.5)

    // Discord button
    let btnDiscord = new Icons.Discord(this, Space.smallButtonWidth + Space.pad, 9)
    .setOrigin(0)

    btnDiscord.setOnClick(this.doDiscord(btnDiscord))

    // Adventure button
    let btnAdventure = new Buttons.Basic(this, Space.windowWidth/2, Space.windowHeight - 100, "Adventure", () => that.doAdventure()).setOrigin(0.5)

    // Start Button
    new Buttons.Basic(this, Space.windowWidth/2, Space.windowHeight/2, "Start", this.doStart()).setOrigin(0.5)//.setStyle(Style.announcement)

    let msgText = UserProgress.getMessage('welcome')
    if (msgText !== undefined) {
      this.displayMessage(msgText)
    }
    
    super.create()
  }

  // Hide the signin button
  beforeExit(): void {
    document.getElementById("signin").hidden = true
  }

  private displayMessage(message: string): void {
    return

    // TODO Rework all this
    let menu = new Menu(
      this,
      1000,
      300,
      true,
      25)

    // TODO Don't always say Congratulations, make the first line of message the title?
    let txtTitle = this.add.text(0, -110, 'Congratulations!', Style.announcement).setOrigin(0.5)
    let txtMessage = this.add.text(0, -50, message, Style.basic).setOrigin(0.5, 0)
    
    menu.add([txtTitle, txtMessage])
  }

  // Do everything that occurs when the start button is pressed - either start, or prompt tutorial
  private doStart(): () => void {
    let that = this
    return function() {
      that.doDeckbuilder()
    }
  }

  private doDeckbuilder(): void {
    UserProgress.addAchievement('deckMenuNotice')
    
    this.beforeExit()
    this.scene.start("BuilderScene", {isTutorial: false})
  }

  private doAdventure(): void {
    this.beforeExit()

    // If user hasn't completed the tutorial, jump to the last tutorial they haven't completed
    const missions = UserSettings._get('completedMissions')
    for (let i = 0; i < intro.length; i++) {

      // If this tutorial mission hasn't been completed, jump to that mission
      if (!missions[i]) {
        this.scene.start("TutorialGameScene", {isTutorial: false, deck: undefined, mmCode: `ai:t${i}`, missionID: i})
        return
      }
    }

    // Otherwise, go to the adventure scene map
    this.scene.start("AdventureScene")
  }

  private doDiscord(btnDiscord: Button): () => void {
    return function() {
      UserProgress.addAchievement('discord')
    
      window.open(Url.discord)
    }
  }
}
