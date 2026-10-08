// RidGame - browser shooter game
// game.js

const canvas = document.getElementById("game");
if (!canvas) throw new Error("Canvas with id='game' not found.");

const ctx = canvas.getContext("2d");

let W = 0, H = 0;
let gameRunning = true;
let score = 0;
let kills = 0;
let ammo = 30;
let maxAmmo = 30;
let reserveAmmo = 120;
let health = 100;
let reloading = false;
let reloadTimer = 0;

const keys = {};
const mouse = { x: 0, y: 0, down: false };

const player = {
  x: 0,
  y: 0,
  radius: 18,
  speed: 4,
  angle: 0
};

const bullets = [];
const enemies = [];
const pickups = [];

const zone = {
  x: 0,
  y: 0,
  radius: 0,
 
