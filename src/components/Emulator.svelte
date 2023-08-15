<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { Screen } from '../emu/component/Screen';
	import { ZCore, type ROM } from '../emu/component/ZCore';

	import root from '../roms/root.cim';

	import puc from '../roms/puc.cim';
	import minesweper from '../roms/minesweeper.cim';
	import snake from '../roms/snake.cim';
	import image from '../roms/image.cim';
	import banner from '../roms/banner.cim';
	import connect4 from '../roms/connect4.cim';
	import life from '../roms/life.cim';

	let theComputer: ZCore;
	let screen: Screen;
	export let canvas: HTMLCanvasElement;
	let keyboardActive = false;
	let loop: number;

	let roms = [
		{ name: 'PUC', start: 0x9000, size: 0x3000, uri: puc },
		{ name: 'Minesweeper', start: 0x9000, size: 0x3000, uri: minesweper },
		{ name: 'Snake', start: 0x9000, size: 0x3000, uri: snake },
		{ name: 'Image', start: 0x9000, size: 0x3000, uri: image },
		{ name: 'Banner', start: 0x9000, size: 0x3000, uri: banner },
		{ name: 'Connect4', start: 0x9000, size: 0x3000, uri: connect4 },
		{ name: 'Life', start: 0x9000, size: 0x3000, uri: life }
	];

	export const emulator = {
		reset() {
			theComputer.cpu.reset();
		},
		init() {
			theComputer.cpu.reset();
			screen.clear();
			setTimeout(async () => {
				//Get Rom from hash
				const romName = window.location.hash?.substring(1);
				console.log(romName)
				let rom = roms.find((rom) => romName.toLocaleLowerCase() == rom.name.toLocaleLowerCase());
				if (rom) {
					emulator.loadRom(rom);
					return;
				}

				const comand = 'E0100#run\r';
				for (let char of comand) {
					if (char === '#') {
						await timer(1000);
						continue;
					}
					theComputer.addToKeyboardBuffer(char);
					await timer(Math.floor(Math.random() * 300));
				}

				await timer(100);

				screen.showWelcome();
				keyboardActive = true;
			}, 600);
		},
		loadRom(rom: ROM) {
			theComputer.mmap.addROM(rom.name, rom.start, rom.size, rom.uri);
			theComputer.cpu.reset();
			//Give time for the CPU to reset
			setTimeout(() => {
				theComputer.addToKeyboardBuffer('E9000\n');
			}, 50);
			keyboardActive = true;
		}
	};

	function inputCharacter(character: string) {
		if (!keyboardActive) {
			return;
		}
		theComputer.addToKeyboardBuffer(character);
		if (character.charCodeAt(0) == 10) {
			theComputer.addToKeyboardBuffer('\r');
		}
	}
	function onkeypress(event: KeyboardEvent) {
		event.preventDefault();
		if (event.which == 9 || event.which == 13 || event.which == 16) {
			event.preventDefault();
			if (event.which == 13) {
				//EnternonScroll
				inputCharacter('\n');
			}
		} else {
			let key = String.fromCharCode(event.which);
			inputCharacter(key);
		}
	}

	function onkeyup(event: KeyboardEvent) {
		//Backspace
		if (event.which == 8) {
			inputCharacter('\b');
		}
		//Break
		if (event.code == 'KeyC' && event.ctrlKey) {
			inputCharacter(String.fromCharCode(3));
		}
	}

	onDestroy(() => {
		clearInterval(loop);
	});

	onMount(async () => {
		screen = new Screen(65, 33, canvas);
		let emuConfig = {
			updateInterval: 1, // ms tick interval
			numCyclesPerTick: 7372 * 3.5, // clock cycles per interval we have to multiply this by 3.5 to match speed for some reason
			peripherals: {
				ROM: [{ name: '8k ROM 0', start: 0x0000, size: 0x2000, uri: root }]
			},
			sendOutput: (text: string) => screen.newChar(text)
		};

		screen.clear();
		loop = setInterval(() => screen.draw(), 32);
		theComputer = new ZCore(emuConfig);
	});

	const timer = (ms: number) => new Promise((res) => setTimeout(res, ms));
</script>

<svelte:window on:keyup={onkeyup} on:keypress={onkeypress} />

<style>
	@font-face {
		font-family: 'Windows Command Prompt';
		src: url('/fonts/Windows-Command-Prompt.woff2') format('woff2'),
			url('/fonts/Windows-Command-Prompt.woff') format('woff');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
</style>
