import React from 'react';

interface LoaderProps {
  hidden: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ hidden }) => {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d1b2a]/85 backdrop-blur-[14px] transition-all duration-500 ${
        hidden ? 'opacity-0 invisible pointer-events-none' : 'opacity-100 visible'
      }`}
    >
      <svg
          className="w-[260px] h-[60px] overflow-visible"
          viewBox="0 0 240 60"
        >
          <text x="50%" y="42" textAnchor="middle" className="loader-text">
            Aula Libre
          </text>
        </svg>
    </div>
  );
};