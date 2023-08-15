<script lang="ts">
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { CrtShader } from '../threed/crtShader';
	import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass';
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
	import { browser } from '$app/environment';
	import Emulator from '../components/Emulator.svelte';
	import { onDestroy, onMount } from 'svelte';
	import Loader from './loader/Loader.svelte';
	import { screenColorHex } from './store/store';

	let screenColor: number;

	screenColorHex.subscribe((value) => {
		screenColor = value;
	});

	let emuCanvas: HTMLCanvasElement;
	let canvas: HTMLCanvasElement;
	let y: number;
	let canvasPosition = 'fixed';
	let top = 0;
	let opacity = 1;
	let emulator: any;

	let animationFrame: number;

	let loaded = false;

	if (browser) {
		emuCanvas = document.createElement('canvas');
	}

	const onScroll = () => {
		canvasPosition = 'fixed';
		top = 0;
		if (y > window.innerHeight) {
			const scaleFactor = window.innerWidth > 768 ? 1.2 : 2;
			opacity = 1 - ((y - window.innerHeight) * scaleFactor) / window.innerHeight;
			if (opacity < 0.2) opacity = 0.2
		} else {
			opacity = 1;
		}
	};

	onDestroy(() => {
		if (browser) {
			console.log(animationFrame);
			cancelAnimationFrame(animationFrame);
		}
	});

	onMount(() => {
		const target2 = new THREE.WebGLRenderer();

		const renderer = new THREE.WebGLRenderer({ canvas });

		//Load EMUc Screen into texture
		const texture = new THREE.CanvasTexture(emuCanvas);

		//texture.rotation = 4.71239;
		//texture.repeat.set(2, 3);
		texture.flipY = false;
		//texture.offset = new THREE.Vector2(0.225, -0.01);
		//texture.center = new THREE.Vector2(0.3, 0.7);
		//texture.wrapT = THREE.ClampToEdgeWrapping;
		const geo = new THREE.BoxGeometry(0.0038, 0.0065, 0.008);
		const material =
			window.innerWidth > 1000
				? new THREE.ShaderMaterial({
						vertexShader: CrtShader.vertexShader,
						fragmentShader: CrtShader.fragmentShader,
						uniforms: {
							tDiffuse: { value: texture },
							iResolution: { type: 'vec2', value: new THREE.Vector2(100000, 2650) }
						}
				  })
				: new THREE.MeshBasicMaterial({ map: texture });

		material.onBeforeCompile(CrtShader, target2);

		const mesh = new THREE.Mesh(geo, material);

		//Setup basic scene
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(
			0.2,
			window.innerWidth / window.innerHeight,
			0.1,
			100
		);

		const light = new THREE.AmbientLight(0x303030); // soft white light
		scene.add(light);

		//Spotlight
		const spotLight = new THREE.SpotLight(0xffffff, 100);
		spotLight.position.set(0, 5, 0);
		spotLight.angle = Math.PI / 6;
		spotLight.penumbra = 1;
		spotLight.decay = 3;
		spotLight.distance = 0;

		spotLight.castShadow = true;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		spotLight.shadow.camera.near = 1;
		spotLight.shadow.camera.far = 10;
		spotLight.shadow.focus = 1;
		scene.add(spotLight);

		const screenGlow = new THREE.PointLight(screenColor, 0.004, 0.01);
		screenGlow.position.set(0.0025, 0.0025, 0);
		screenGlow.castShadow = true;
		// Load the Model
		const loader = new GLTFLoader();
		loader.load('/retro_computer.glb', (gltf) => {
			gltf.scene.children[2].material = material;
			const model = gltf.scene;
			model.castShadow = true;
			model.receiveShadow = true;
			model.add(screenGlow);
			scene.add(model);
			animate(model);

			loaded = true;
			emulator.init();
			onScroll();
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.shadowMap.enabled = true;

		camera.position.y = 0.00235;

		function animate(gltf) {
			animationFrame = requestAnimationFrame(() => animate(gltf));
			if (typeof texture.needsUpdate !== undefined) {
				//@ts-ignore
				texture.needsUpdate = true;
			}

			screenGlow.color.set(screenColor);

			mesh.scale.set(10, 10, 10);

			const boundedScrollY = y > window.innerHeight ? window.innerHeight : y;
			let baseZ = window.innerWidth > 1000 ? 2 : 6;
			const zscale = window.innerWidth > 1000 ? 4 : 7;

			const baseY = window.innerWidth > 1000 ? 0.00235 : 0;

			camera.position.z = baseZ + (boundedScrollY / window.innerHeight) * zscale;
			camera.position.y = baseY - boundedScrollY / window.innerHeight / 500;

			gltf.rotation.y = 4.7 - boundedScrollY / window.innerHeight;

			renderer.render(scene, camera);
		}
	});
</script>

{#if !loaded}
	<div class="fixed z-20 top-0 left-0 bottom-0 right-0 bg-black flex justify-center items-center">
		<Loader />
	</div>
{/if}

<Emulator bind:emulator canvas={emuCanvas} />
<svelte:window bind:scrollY={y} on:scroll={onScroll} />
<div style="position: {canvasPosition}; top:{top}px ; opacity:{opacity}">
	<canvas bind:this={canvas} />
</div>
<div class="md:h-[170vh] h-[130vh]" />
