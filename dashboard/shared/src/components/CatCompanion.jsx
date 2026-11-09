import React, { useEffect, useRef, useState } from 'react';

export const PeekingCatIllustration = ({ isDark }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPetted, setIsPetted] = useState(false);
  const petTimeout = useRef(null);

  useEffect(() => () => window.clearTimeout(petTimeout.current), []);

  const handlePet = () => {
    window.clearTimeout(petTimeout.current);
    setIsPetted(true);
    petTimeout.current = window.setTimeout(() => setIsPetted(false), 1400);
  };

  return (
    <div
      onClick={handlePet}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlePet(); } }}
      role="button"
      tabIndex={0}
      aria-label="Pet the CollectFlow cat"
      aria-pressed={isPetted}
      title="Click to pet the kitty! 🐾"
      className="relative flex items-end select-none cursor-pointer group"
    >
      {/* Floating Hearts when petted */}
      {isPetted && (
        <div className="absolute -top-5 left-16 pointer-events-none flex gap-3 z-30">
          <span className="text-rose-400 text-sm animate-bounce">♥</span>
          <span className="text-pink-400 text-base -mt-2 animate-ping">♥</span>
          <span className="text-rose-400 text-xs animate-bounce">♥</span>
        </div>
      )}

      <svg
        className="w-48 h-28 overflow-visible transition-transform duration-300"
        viewBox="0 0 215 118"
        fill="none"
      >
        <defs>
          {/* Warm Radial Cream Face Shading */}
          <radialGradient id="kawaiiCatFaceGrad" cx="50%" cy="56%" r="54%">
            <stop offset="0%" stopColor="#fffdf9" />
            <stop offset="72%" stopColor="#fff4e0" />
            <stop offset="100%" stopColor="#f8dfc0" />
          </radialGradient>
          {/* Soft Inner Ear Pink Gradient */}
          <linearGradient id="kawaiiEarPink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffccd5" />
            <stop offset="100%" stopColor="#f497a9" />
          </linearGradient>
          <linearGradient id="kawaiiCloudFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? '#c2afff' : '#ffffff'} stopOpacity={isDark ? '0.7' : '0.96'} />
            <stop offset="100%" stopColor={isDark ? '#7964b3' : '#dcd2f5'} stopOpacity={isDark ? '0.42' : '0.76'} />
          </linearGradient>
          <filter id="kawaiiCloudSoftness" x="-15%" y="-25%" width="130%" height="160%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* Soft translucent clouds sit behind the cat and foliage. */}
        <g opacity={isDark ? 0.34 : 0.62} filter="url(#kawaiiCloudSoftness)">
          <path
            d="M36 55 C33 48 39 41 48 41 C49 32 57 27 66 29 C70 19 81 16 90 21 C96 10 110 9 118 18 C128 11 142 16 144 27 C155 25 163 33 162 43 C171 44 176 50 173 57 C169 63 160 65 151 65 H52 C44 65 39 61 36 55 Z"
            fill="url(#kawaiiCloudFill)"
          />
          <path
            d="M5 67 C3 62 7 57 13 57 C14 51 20 48 26 50 C30 43 39 43 43 49 C50 47 56 52 55 58 C61 59 64 63 62 68 C60 72 55 73 50 73 H16 C11 73 7 71 5 67 Z"
            fill="url(#kawaiiCloudFill)"
            opacity="0.82"
          />
          <path
            d="M161 72 C159 67 163 62 169 62 C171 55 178 53 184 56 C188 49 197 50 201 56 C207 54 212 59 211 65 C216 66 218 70 216 74 C214 78 209 79 204 79 H173 C167 79 163 77 161 72 Z"
            fill="url(#kawaiiCloudFill)"
            opacity="0.76"
          />
        </g>

        {/* Left Botanical Leaves (Sway on hover) */}
        <g
          className={`transition-transform duration-500 origin-bottom ${
            isHovered ? '-rotate-6' : ''
          }`}
        >
          <path
            d="M28 106 Q18 82 10 70"
            stroke={isDark ? '#8969dc' : '#9270e7'}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M19 88 C9 85, 6 75, 16 74 C23 74, 24 83, 19 88 Z"
            fill={isDark ? '#8666dc' : '#a58cf0'}
          />
          <path
            d="M24 96 C32 90, 38 80, 29 77 C22 76, 21 88, 24 96 Z"
            fill={isDark ? '#9270e7' : '#b9a8f5'}
          />
          {/* Floating Coral Heart above Left Leaf */}
          <path
            d="M22 46 C19 41, 12 43, 14 49 C15.5 53, 21 56, 22 57 C23 56, 28.5 53, 30 49 C32 43, 25 41, 22 46 Z"
            fill="#ef7a68"
          />
        </g>

        {/* Right Botanical Leaves (Sway on hover) */}
        <g
          className={`transition-transform duration-500 origin-bottom ${
            isHovered ? 'rotate-6' : ''
          }`}
        >
          <path
            d="M180 106 Q192 86 202 76"
            stroke={isDark ? '#8969dc' : '#9270e7'}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M190 92 C200 90, 205 80, 196 78 C189 77, 187 86, 190 92 Z"
            fill={isDark ? '#8666dc' : '#a58cf0'}
          />
          <path
            d="M184 98 C177 92, 173 82, 181 80 C187 79, 188 90, 184 98 Z"
            fill={isDark ? '#9270e7' : '#b9a8f5'}
          />
        </g>

        {/* Left Chibi Cat Ear */}
        <path
          d="M52 60 C43 35, 47 16, 57 14 C67 12, 82 26, 90 40 Z"
          fill="#bba8ed"
          stroke="#4a2c1d"
          strokeWidth="2.7"
          strokeLinejoin="round"
        />
        <path
          d="M57 52 C51 37, 54 23, 60 22 C66 21, 76 30, 81 39 Z"
          fill="url(#kawaiiEarPink)"
        />

        {/* Right Chibi Cat Ear */}
        <path
          d="M158 60 C167 35, 163 16, 153 14 C143 12, 128 26, 120 40 Z"
          fill="#eb9c5c"
          stroke="#4a2c1d"
          strokeWidth="2.7"
          strokeLinejoin="round"
        />
        <path
          d="M153 52 C159 37, 156 23, 150 22 C144 21, 134 30, 129 39 Z"
          fill="url(#kawaiiEarPink)"
        />

        {/* Plump Squishy Chibi Head with Side Cheek Fluff Tufts */}
        <path
          d="M44 106 C33 93, 35 76, 42 70 C38 66, 44 59, 49 56 C61 36, 83 31, 105 31 C127 31, 149 36, 161 56 C166 59, 172 66, 168 70 C175 76, 177 93, 166 106 Z"
          fill="url(#kawaiiCatFaceGrad)"
        />

        {/* Soft Ginger Tabby Patches on Left & Right Forehead */}
        <path
          d="M53 53 C67 36, 88 31, 101 31 C93 46, 77 60, 46 66 C47 60, 50 56, 53 53 Z"
          fill="#b19be8"
        />
        <path
          d="M157 53 C143 36, 122 31, 109 31 C117 46, 133 60, 164 66 C163 60, 160 56, 157 53 Z"
          fill="#a58cf0"
        />

        {/* Cute Rounded Forehead Tabby Stripes */}
        <rect x="102.5" y="33" width="5" height="13" rx="2.5" fill="#8355c8" opacity="0.85" />
        <rect
          x="92"
          y="35"
          width="4.5"
          height="10"
          rx="2.2"
          transform="rotate(-14 92 35)"
          fill="#8355c8"
          opacity="0.8"
        />
        <rect
          x="113.5"
          y="35"
          width="4.5"
          height="10"
          rx="2.2"
          transform="rotate(14 113.5 35)"
          fill="#8355c8"
          opacity="0.8"
        />

        {/* Head Outline Redraw */}
        <path
          d="M44 106 C33 93, 35 76, 42 70 C38 66, 44 59, 49 56 C61 36, 83 31, 105 31 C127 31, 149 36, 161 56 C166 59, 172 66, 168 70 C175 76, 177 93, 166 106"
          stroke="#4a2c1d"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Plump Rosy Kawaii Cheek Blushes with Diagonal Blush Lines */}
        <ellipse cx="67" cy="84" rx="11.5" ry="6.8" fill="#ff8fa3" opacity="0.55" />
        <ellipse cx="143" cy="84" rx="11.5" ry="6.8" fill="#ff8fa3" opacity="0.55" />
        <path
          d="M63 83 L61 86 M68 83 L66 86 M141 83 L139 86 M146 83 L144 86"
          stroke="#e05772"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Big Glossy Chocolate-Brown Eyes with Dual White Specular Sparkles (or Happy ^ω^ Arcs when petted) */}
        {isPetted ? (
          <g>
            <path
              d="M71 74 Q79 64 87 74"
              stroke="#3b2012"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M123 74 Q131 64 139 74"
              stroke="#3b2012"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ) : (
          <g>
            {/* Left Eye */}
            <circle cx="79" cy="73" r="7.4" fill="#3b2012" />
            <circle cx="76.5" cy="70.2" r="2.8" fill="#ffffff" />
            <circle cx="81.8" cy="75.8" r="1.3" fill="#ffffff" />
            <path
              d="M73 63.5 Q79 61 84 63.5"
              stroke="#4a2c1d"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Right Eye */}
            <circle cx="131" cy="73" r="7.4" fill="#3b2012" />
            <circle cx="128.5" cy="70.2" r="2.8" fill="#ffffff" />
            <circle cx="133.8" cy="75.8" r="1.3" fill="#ffffff" />
            <path
              d="M126 63.5 Q131 61 137 63.5"
              stroke="#4a2c1d"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Tiny Upside-Down Pink Triangle Nose */}
        <path
          d="M101.5 77.5 C101.5 76, 108.5 76, 108.5 77.5 C108.5 79.5, 106.2 81.8, 105 81.8 C103.8 81.8, 101.5 79.5, 101.5 77.5 Z"
          fill="#f27d92"
          stroke="#4a2c1d"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/*Tiny Pink Tongue Peeking Out on Hover or Pet */}
        {(isHovered || isPetted) && (
          <path
            d="M101.5 85 C101.5 91.5, 108.5 91.5, 108.5 85 Z"
            fill="#ff8fa3"
            stroke="#4a2c1d"
            strokeWidth="1.7"
          />
        )}

        {/* Classic Kawaii 'ω' Cat Mouth */}
        <path
          d="M96 84 C98.5 88.5, 103.5 88, 105 82 C106.5 88, 111.5 88.5, 114 84"
          stroke="#4a2c1d"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Whiskers */}
        <path
          d="M46 77 L30 74 M44 84 L28 85 M47 90 L33 93"
          stroke="#4a2c1d"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M164 77 L180 74 M166 84 L182 85 M163 90 L177 93"
          stroke="#4a2c1d"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Left Chubby Marshmallow Paw (Fixed on ledge) */}
        <g transform="translate(42, 95)">
          <ellipse
            cx="17"
            cy="11"
            rx="15"
            ry="10"
            fill="#fffdf9"
            stroke="#4a2c1d"
            strokeWidth="2.6"
          />
          <ellipse cx="17" cy="7.5" rx="6" ry="3" fill="#ffccd5" opacity="0.55" />
          <path
            d="M12 11 C11 15, 11 18, 12 20 M22 11 C23 15, 23 18, 22 20"
            stroke="#4a2c1d"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Right Chubby Marshmallow Paw (Fixed on ledge) */}
        <g transform="translate(134, 95)">
          <ellipse
            cx="17"
            cy="11"
            rx="15"
            ry="10"
            fill="#fffdf9"
            stroke="#4a2c1d"
            strokeWidth="2.6"
          />
          <ellipse cx="17" cy="7.5" rx="6" ry="3" fill="#ffccd5" opacity="0.55" />
          <path
            d="M12 11 C11 15, 11 18, 12 20 M22 11 C23 15, 23 18, 22 20"
            stroke="#4a2c1d"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Handwritten Note Next to the Kitty */}
      <div
        className={`hidden sm:block mb-5 -ml-1 transform -rotate-6 text-[11px] leading-tight font-semibold tracking-wide ${
          isDark ? 'text-slate-300' : 'text-[#625772]'
        }`}
        style={{ fontFamily: "'Comic Sans MS', 'Bradley Hand', cursive, sans-serif" }}
      >
        <p>Small steps,</p>
        <p className="flex items-center gap-1">
          big recoveries! <span className="text-rose-400 text-xs">♥</span>
        </p>
      </div>
    </div>
  );
};

