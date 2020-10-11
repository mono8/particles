import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import './App.css';
import './canvas.style.css';
import ImageBar from './ImageBar';
import { launch } from './setup';
import { TimelineMax, Power2 } from 'gsap';

function App() {
    const [imagesObj, setImages] = useState<any[]>([]);
    const [source, setSource] = useState(0);
    const [target, setTarget] = useState(0);
    const [points, setPoints] = useState<THREE.Points | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        async function getData() {
            const { images, points } = await launch();
            setImages(images);
            setPoints(points);
        }
        getData();
    }, []);

    // @ts-ignore
    const startAnimation = (material, geometry) => {
        setIsAnimating(true);
        material.uniforms.blend.value = 0;
        material.uniforms.sourceTex.value = imagesObj[source].texture;
        geometry.setAttribute(
            'source',
            new THREE.Float32BufferAttribute(imagesObj[source].coordinates, 2)
        );
        material.uniforms.targetTex.value = imagesObj[target].texture;
        geometry.setAttribute(
            'target',
            new THREE.Float32BufferAttribute(imagesObj[target].coordinates, 2)
        );

        let tl = new TimelineMax({ paused: true });
        tl.eventCallback('onComplete', () => {
            setIsAnimating(false);
            setSource(target);
        });
        tl.to(
            material.uniforms.blend,
            4,
            {
                value: 1,
                ease: Power2.easeOut,
            },
            0
        );
        tl.play();
    };

    const handleClick = (id: number) => {
        if (isAnimating) return;
        setTarget(id);
    };

    useEffect(() => {
        if (source === target) return;
        startAnimation(points?.material, points?.geometry);
    }, [target, points]);

    return (
        <div className='App' id='app'>
            <ImageBar images={imagesObj} onClick={handleClick}></ImageBar>
        </div>
    );
}

export default App;
