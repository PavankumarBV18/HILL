import Phaser from 'phaser';
import Game from './Game';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#87CEEB', // Sky blue default
  physics: {
    default: 'matter',
    matter: {
      debug: false, // Set to true to see physics wireframes
      gravity: { y: 1 }, // Standard gravity
      runner: {
        isFixed: false, // Variable time step for smooth rendering
        fps: 60
      }
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [Game]
};

const game = new Phaser.Game(config);

export default game;
