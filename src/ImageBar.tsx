import React from 'react';
import './ImageBar.style.css';

export default function ImageBar(props: any) {
    const { images, onClick } = props;
    const handleClick = (id: number) => {
        onClick(id);
    };
    return (
        <div className={'container'}>
            {images.map((obj: any, index: number) => {
                return (
                    <img
                        key={obj.file}
                        onClick={() => handleClick(index)}
                        className={'item'}
                        src={obj.file}
                    ></img>
                );
            })}
        </div>
    );
}
