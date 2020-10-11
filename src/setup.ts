import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import vg from './vg.jpg';
import lovers from './lovers.png';
import sonofman from './sonofman.png';
import waves from './waves.jpg';
import dali from './dali.jpg';
import girl from './girl.jpg';
import { HSL } from 'three';

const glsl = (x: TemplateStringsArray): string => x.toString();

const vertexShader = glsl`
    precision highp float;

    attribute vec3 position;
    attribute vec2 source;
    attribute vec2 target;

    uniform sampler2D sourceTex;
    uniform sampler2D targetTex;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    uniform float size;
    uniform float blend;
    uniform vec2 dimensions;

    varying vec3 vColor;
    const float PI = 3.14159265359;


    void main() {
        float pBlend = 0.;
		float threshold = ( position.y * dimensions.x + position.x) * .5 / ( dimensions.x * dimensions.y );
		if( 1.5 * blend > threshold ) {
			pBlend = 1.5 * blend - threshold;
        }
        pBlend = clamp(pBlend, 0.,1.);

        vec3 origin = vec3(source, 0.);
        vec3 destination = vec3(target, 0.);
        vec3 p = mix(origin, destination, pBlend);

        float l = length(destination - origin);

        vec2 uvS = source / dimensions.x;
        vec2 uvT = target / dimensions.x;

        vec3 d = destination - origin;
		vec3 c = origin + d / 2.;
		p.xy = c.xy - .5 * d.xy * cos(pBlend*PI);

        p.z = 0.2 * l * sin(PI*pBlend);

        vColor = mix(texture2D(sourceTex, uvS).rgb, texture2D(targetTex, uvT).rgb, pBlend);
        p.xy -= 0.5 * dimensions; 
        p *= 1. / dimensions.x;
        p.y *= - 1.;

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = size * ( 2. / - mvPosition.z );
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = glsl`
    precision highp float;

    varying vec3 vColor;

    void main() {
        gl_FragColor = vec4(vColor, 1.);
    }
`;

let camera: THREE.PerspectiveCamera,
    controls,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    geometry: THREE.BufferGeometry,
    points: THREE.Points,
    material: any;

async function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerWidth);
    renderer.setClearColor(new THREE.Color(0x2a251f));

    var container = document.getElementById('app');
    container?.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.001, 100);
    camera.position.set(0, 0, 1);

    controls = new OrbitControls(camera, renderer.domElement);

    function loadImages(
        paths: any[],
        whenLoaded: { (loadedImages: any): void; (arg0: any[]): void }
    ) {
        return new Promise((res, rej) => {
            var imgs: HTMLImageElement[] = [];
            paths.forEach(function (path: string) {
                var img = new Image();
                img.onload = function () {
                    imgs.push(img);
                    if (imgs.length === paths.length) {
                        whenLoaded(imgs);
                        res();
                    }
                };
                img.src = path;
            });
        });
    }

    let images = [vg, girl, sonofman, waves, lovers, dali];

    let imagesObj: any = new Array(images.length).fill(undefined).map((n) => ({}));

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    await loadImages(images, (loadedImages: HTMLImageElement[]) => {
        imagesObj.forEach((element: any, index: number) => {
            // @ts-ignore
            element.file = loadedImages[index].src;
            const img = loadedImages[index];

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            ctx = ctx as CanvasRenderingContext2D;
            ctx.drawImage(img, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            let rgb: Array<{ color: THREE.Color; index: number }> = [];
            let color = new THREE.Color();

            for (let i = 0; i < imgData.length; i += 4) {
                color = color.setRGB(imgData[i], imgData[i + 1], imgData[i + 2]);
                rgb.push({ color: color.clone(), index: i / 4 });
            }

            const w = img.width;
            const h = img.height;
            const coordinates = new Float32Array(w * h * 2);

            let tmp1: HSL = { h: 0, s: 0, l: 0 };
            let tmp2: HSL = { h: 0, s: 0, l: 0 };
            rgb.sort((a, b) => {
                a.color.getHSL(tmp1);
                b.color.getHSL(tmp2);
                return tmp1.s - tmp2.s;
            });
            let t = 0;
            rgb.forEach((e) => {
                coordinates[t] = e.index % w;
                coordinates[t + 1] = Math.floor(e.index / h);
                t += 2;
            });

            element.image = img;
            element.rgb = rgb;
            element.texture = new THREE.TextureLoader().load(element.file);
            element.coordinates = coordinates;
        });
    });

    const w = imagesObj[0].image.width;
    const h = imagesObj[0].image.height;
    let positions = new Float32Array(w * h * 3);
    let k = 0;
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            positions[k * 3] = j;
            positions[k * 3 + 1] = i;
            positions[k * 3 + 2] = 0;
            k++;
        }
    }

    geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('source', new THREE.BufferAttribute(imagesObj[0].coordinates, 2));
    geometry.setAttribute('target', new THREE.BufferAttribute(imagesObj[1].coordinates, 2));

    imagesObj.forEach((item: any) => {
        item.texture.flipY = false;
    });

    material = new THREE.RawShaderMaterial({
        uniforms: {
            sourceTex: { value: imagesObj[0].texture },
            targetTex: { value: imagesObj[1].texture },
            size: { value: window.devicePixelRatio },
            blend: { value: 0 },
            dimensions: {
                value: new THREE.Vector2(imagesObj[0].image.width, imagesObj[0].image.height),
            },
        },
        vertexShader,
        fragmentShader,
    });

    points = new THREE.Points(geometry, material);

    scene.add(points);

    resize();

    return imagesObj;
}

function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    renderer.render(scene, camera);
}

export async function launch() {
    const images = await init();
    animate();
    return { images, points };
}
