import React, { useState, useEffect } from 'react';

const AnalogClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const seconds = time.getSeconds();
    const minutes = time.getMinutes();
    const hours = time.getHours();

    const secondHandRotation = seconds * 6;
    const minuteHandRotation = minutes * 6 + seconds * 0.1;
    const hourHandRotation = (hours % 12) * 30 + minutes * 0.5;

    const clockSize = 80;
    const center = clockSize / 2;
    const strokeWidth = 2;

    return (
        <div style={{ width: `${clockSize}px`, height: `${clockSize}px`, marginBottom: '8px' }}>
            <svg viewBox={`0 0 ${clockSize} ${clockSize}`} style={{ overflow: 'visible' }}>
                {/* Clock Face */}
                <circle cx={center} cy={center} r={center - 1} fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
                
                {/* Hour Hand */}
                <line
                    x1={center} y1={center} x2={center} y2={center - (clockSize / 4)}
                    stroke="white" strokeWidth={strokeWidth} strokeLinecap="round"
                    transform={`rotate(${hourHandRotation} ${center} ${center})`}
                />
                
                {/* Minute Hand */}
                <line
                    x1={center} y1={center} x2={center} y2={center - (clockSize / 3)}
                    stroke="white" strokeWidth={strokeWidth - 0.5} strokeLinecap="round"
                    transform={`rotate(${minuteHandRotation} ${center} ${center})`}
                />

                {/* Second Hand */}
                <line
                    x1={center} y1={center} x2={center} y2={center - (clockSize / 2.5)}
                    stroke="#a78bfa" strokeWidth="1" strokeLinecap="round"
                    transform={`rotate(${secondHandRotation} ${center} ${center})`}
                />

                {/* Center dot */}
                <circle cx={center} cy={center} r="2" fill="white" />
            </svg>
        </div>
    );
};

export default AnalogClock;