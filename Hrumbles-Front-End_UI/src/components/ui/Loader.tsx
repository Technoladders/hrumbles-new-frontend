import React from "react";

interface LoaderProps {
  size?: number;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 48, className = "" }) => {
  const cubeSize = size / 2;

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <div
        className="loader-cube"
        style={{
          width: cubeSize,
          height: cubeSize,
          backgroundColor: "#b44bcb",
        }}
      />
      <style>
        {`
          .loader-cube {
            animation: cubeSpin 1.2s infinite ease-in-out;
            transform-origin: center;
          }

          @keyframes cubeSpin {
            0% {
              transform: perspective(100px) rotateX(0deg) rotateY(0deg);
            }
            50% {
              transform: perspective(100px) rotateX(180deg) rotateY(0deg);
            }
            100% {
              transform: perspective(100px) rotateX(180deg) rotateY(180deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Loader;
