import React, { useEffect, useRef, useState } from 'react';

function usePetReaction() {
  const [petted, setPetted] = useState(false);
  const timeout = useRef(null);
  useEffect(() => () => window.clearTimeout(timeout.current), []);
  const pet = () => {
    window.clearTimeout(timeout.current);
    setPetted(true);
    timeout.current = window.setTimeout(() => setPetted(false), 1400);
  };
  return { petted, pet };
}

function MascotFrame({ label, isDark, petted, pet, compact = false, noHoverLift = false, children }) {
  return <div
    role="button"
    tabIndex={0}
    aria-label={`Pet the ${label}`}
    aria-pressed={petted}
    title={`Tap to pet the ${label}!`}
    onClick={pet}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pet(); } }}
    className={`group relative flex cursor-pointer select-none items-end transition-transform duration-300 ${noHoverLift ? '' : 'hover:-translate-y-1'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400`}
  >
    {petted && <div className="pointer-events-none absolute -top-2 left-1/2 z-20 flex -translate-x-1/2 gap-2 text-rose-400"><span className="animate-bounce text-xs">♥</span><span className="-mt-2 animate-ping text-sm">♥</span><span className="animate-bounce text-[10px]">♥</span></div>}
    {children}
    {!compact && <span className={`mb-3 ml-1 hidden -rotate-6 text-[10px] font-semibold leading-tight sm:block ${isDark ? 'text-violet-200' : 'text-[#766a8d]'}`}>A little care,<br />goes a long way <span className="text-rose-400">♥</span></span>}
  </div>;
}

export function PandaCompanion({ isDark }) {
  const { petted, pet } = usePetReaction();
  return <MascotFrame label="panda" isDark={isDark} petted={petted} pet={pet}>
    <svg className="h-28 w-48 overflow-visible" viewBox="0 0 215 118" fill="none" aria-hidden="true">
      <ellipse cx="110" cy="108" rx="51" ry="6" fill={isDark ? '#8066bd' : '#c9bee2'} opacity=".32" />
      {/* Bamboo sprig behind the panda */}
      <path d="M38 105 Q39 78 27 58 M37 86 Q23 78 20 68 M39 76 Q51 70 54 59" stroke={isDark ? '#80ad8b' : '#81a986'} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 68 C13 64 14 57 23 59 C28 60 27 65 21 68Z M53 60 C52 51 59 49 62 56 C63 61 58 63 53 60Z" fill={isDark ? '#8bc39a' : '#91bd91'} />
      {/* Panda body, arms and paws */}
      <ellipse cx="108" cy="91" rx="31" ry="27" fill="#272437" />
      <ellipse cx="108" cy="95" rx="17" ry="19" fill={isDark ? '#f0eafa' : '#fffdfd'} />
      <ellipse cx="83" cy="88" rx="11" ry="18" transform="rotate(-25 83 88)" fill="#282638" />
      <ellipse cx="133" cy="88" rx="11" ry="18" transform="rotate(25 133 88)" fill="#282638" />
      <ellipse cx="90" cy="105" rx="13" ry="8" fill="#282638" />
      <ellipse cx="126" cy="105" rx="13" ry="8" fill="#282638" />
      <circle cx="91" cy="105" r="2" fill="#d9b7ce" /><circle cx="98" cy="107" r="2" fill="#d9b7ce" />
      <circle cx="120" cy="107" r="2" fill="#d9b7ce" /><circle cx="127" cy="105" r="2" fill="#d9b7ce" />
      {/* Round panda head */}
      <circle cx="108" cy="48" r="37" fill="#282638" />
      <circle cx="108" cy="51" r="31" fill={isDark ? '#faf8ff' : '#fffefd'} />
      <circle cx="81" cy="23" r="12" fill="#282638" /><circle cx="135" cy="23" r="12" fill="#282638" />
      <circle cx="81" cy="23" r="5.5" fill="#d9b8d0" /><circle cx="135" cy="23" r="5.5" fill="#d9b8d0" />
      {/* Eye patches and happy eyes */}
      <ellipse cx="94" cy="48" rx="8.5" ry="11" transform="rotate(22 94 48)" fill="#282638" />
      <ellipse cx="122" cy="48" rx="8.5" ry="11" transform="rotate(-22 122 48)" fill="#282638" />
      {petted ? <g stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M90 48 Q94 52 98 48" /><path d="M118 48 Q122 52 126 48" /></g> : <g fill="#fff"><circle cx="96" cy="45" r="2" /><circle cx="124" cy="45" r="2" /></g>}
      {/* A bamboo shoot reaches the panda's mouth and rests in its paw. */}
      <path d="M162 108C145 94 133 81 122 70C118 66 115 63 112 60" stroke={isDark ? '#6f9d75' : '#719f60'} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M148 95l4-5M136 83l4-5M125 72l4-5" stroke={isDark ? '#9ac590' : '#98bf79'} strokeWidth="2" strokeLinecap="round" />
      <path d="M151 93C155 81 165 77 171 81C168 91 160 96 151 93Z" fill={isDark ? '#75ac79' : '#7eaf69'} />
      <path d="M139 84C133 74 137 65 144 63C150 71 148 79 139 84Z" fill={isDark ? '#83b783' : '#92c47c'} />
      <path d="M126 71C120 62 122 55 128 53C134 60 133 67 126 71Z" fill={isDark ? '#75ac79' : '#7eaf69'} />
      <ellipse cx="108" cy="57" rx="4" ry="3" fill="#30273a" />
      <path d={petted ? 'M103 62 Q108 68 113 62' : 'M104 62 Q108 66 112 62'} stroke="#65465c" strokeWidth="1.7" strokeLinecap="round" />
      <ellipse cx="85" cy="60" rx="5" ry="3" fill="#f59bb5" opacity=".58" /><ellipse cx="131" cy="60" rx="5" ry="3" fill="#f59bb5" opacity=".58" />
      {petted && <path d="M151 25 l2 5 5 1 -5 2 -2 5 -2 -5 -5 -2 5 -1z" fill="#f5c765" />}
    </svg>
  </MascotFrame>;
}

export function DogCompanion({ isDark, compact = false }) {
  const { petted, pet } = usePetReaction();
  return <MascotFrame label="sleepy dog" isDark={isDark} petted={petted} pet={pet} compact={compact}>
    <svg className={`${compact ? 'h-24 w-40' : 'h-28 w-48'} overflow-visible`} viewBox="0 0 215 118" fill="none" aria-hidden="true">
      <ellipse cx="111" cy="106" rx="61" ry="7" fill={isDark ? '#8066bd' : '#c9bee2'} opacity=".28" />
      {/* Cozy curled body and paws */}
      <ellipse cx="129" cy="80" rx="50" ry="28" fill={isDark ? '#bd8b5f' : '#d7a274'} />
      <ellipse cx="133" cy="78" rx="37" ry="21" fill={isDark ? '#e9c79f' : '#f5d8b4'} />
      <ellipse cx="107" cy="98" rx="14" ry="7" fill="#f6e5d1" stroke="#684a3d" strokeWidth="2" />
      <ellipse cx="143" cy="98" rx="14" ry="7" fill="#f6e5d1" stroke="#684a3d" strokeWidth="2" />
      {/* Floppy ears */}
      <path d="M69 45C55 38 50 56 57 75C61 86 73 83 79 68Z" fill={isDark ? '#9c684e' : '#a97659'} stroke="#684a3d" strokeWidth="2.4" />
      <path d="M143 45C158 37 166 53 160 72C157 83 145 84 139 68Z" fill={isDark ? '#9c684e' : '#a97659'} stroke="#684a3d" strokeWidth="2.4" />
      {/* Round face and cream muzzle */}
      <ellipse cx="108" cy="61" rx="42" ry="35" fill={isDark ? '#dfb58c' : '#f1c99d'} stroke="#684a3d" strokeWidth="2.5" />
      <path d="M84 65C87 53 98 50 108 57C118 50 130 53 133 65C133 77 122 83 108 83C94 83 84 77 84 65Z" fill="#fff3df" />
      {petted ? <g stroke="#4d352e" strokeWidth="2.4" strokeLinecap="round"><path d="M87 58Q93 64 99 58" /><path d="M117 58Q123 64 129 58" /></g> : <g fill="#49342e"><ellipse cx="93" cy="58" rx="3.6" ry="4.6" /><ellipse cx="123" cy="58" rx="3.6" ry="4.6" /><circle cx="92" cy="56.5" r="1.2" fill="white" /><circle cx="122" cy="56.5" r="1.2" fill="white" /></g>}
      <ellipse cx="108" cy="67" rx="5" ry="3.8" fill="#49342e" />
      <path d={petted ? 'M102 73Q108 80 114 73' : 'M103 73Q108 78 113 73'} stroke="#684a3d" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="82" cy="68" rx="6" ry="3.5" fill="#f39bb2" opacity=".62" /><ellipse cx="134" cy="68" rx="6" ry="3.5" fill="#f39bb2" opacity=".62" />
      {/* Tail, sleepy marks, and a little heart */}
      <path d="M175 72C193 59 199 73 188 81" stroke={isDark ? '#bd8b5f' : '#d7a274'} strokeWidth="8" strokeLinecap="round" />
      <path d="M176 72C194 59 200 73 189 81" stroke="#684a3d" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M64 20C59 15 52 21 57 26L66 34L75 25C80 18 70 14 66 20Z" fill="#f18b9e" />
      <path d="M145 24Q149 19 153 24M153 19Q157 14 161 19" stroke={isDark ? '#cfbee9' : '#9a7ec6'} strokeWidth="2" strokeLinecap="round" />
      {petted && <path d="M169 34l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z" fill="#ffd978" />}
    </svg>
  </MascotFrame>;
}

export function OctopusCompanion({ isDark, compact = false }) {
  const { petted, pet } = usePetReaction();
  const arm = isDark ? '#a58af1' : '#926de0';
  const sucker = isDark ? '#decfff' : '#d9c8ff';
  const waveLine = isDark ? '#8de3ee' : '#47b9d0';
  return <MascotFrame label="octopus" isDark={isDark} petted={petted} pet={pet} compact={compact}>
    <svg className={`${compact ? 'h-24 w-40' : 'h-28 w-48'} overflow-visible drop-shadow-[0_9px_10px_rgba(81,54,133,.18)]`} viewBox="0 0 215 118" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="octopusOceanBack" x1="10" y1="68" x2="210" y2="116" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#38b8d2' : '#73dce4'} stopOpacity={isDark ? '.08' : '.13'} />
          <stop offset=".52" stopColor={isDark ? '#58cce1' : '#72c8e9'} stopOpacity={isDark ? '.2' : '.22'} />
          <stop offset="1" stopColor={isDark ? '#8472d7' : '#9a83e5'} stopOpacity={isDark ? '.12' : '.14'} />
        </linearGradient>
        <linearGradient id="octopusOceanFront" x1="4" y1="88" x2="214" y2="118" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#59d9e7' : '#7ddfe2'} stopOpacity={isDark ? '.14' : '.18'} />
          <stop offset="1" stopColor={isDark ? '#8180df' : '#aa91ea'} stopOpacity={isDark ? '.13' : '.15'} />
        </linearGradient>
      </defs>
      <g className="cf-wave-drift-slow">
        <path d="M3 80C21 67 38 67 57 79C77 92 94 92 114 80C135 67 153 67 174 80C190 90 202 89 213 82V118H3V80Z" fill="url(#octopusOceanBack)" />
        <path d="M2 78C20 65 38 65 57 77C76 89 95 90 115 77C135 64 154 65 174 78C190 88 202 88 214 80" stroke={waveLine} strokeWidth="1.5" strokeLinecap="round" opacity={isDark ? '.48' : '.42'} />
      </g>
      <g className="cf-wave-drift-fast">
        <path d="M2 93C21 84 38 84 56 94C73 104 88 105 105 96C124 85 141 83 160 93C179 103 196 101 214 91V118H2V93Z" fill="url(#octopusOceanFront)" />
        <path d="M1 91C20 82 38 82 57 92C74 102 89 103 106 94C125 83 143 81 161 91C180 101 197 99 214 89" stroke={waveLine} strokeWidth="1.2" strokeLinecap="round" opacity={isDark ? '.38' : '.34'} />
      </g>
      <g fill={waveLine} opacity={isDark ? '.48' : '.42'}>
        <circle cx="27" cy="58" r="2.1" /><circle cx="36" cy="48" r="1.4" /><circle cx="184" cy="55" r="1.8" /><circle cx="194" cy="46" r="1.2" />
      </g>
      <ellipse cx="108" cy="109" rx="52" ry="6" fill={isDark ? '#8066bd' : '#c9bee2'} opacity=".32" />
      {/* Eight wavy arms */}
      <g stroke={arm} strokeWidth="9" strokeLinecap="round">
        <path d="M83 63 C68 63 73 77 59 78 C49 79 55 93 43 96" />
        <path d="M88 69 C76 80 86 86 75 96 C67 103 75 111 64 115" />
        <path d="M97 73 C88 87 102 91 94 101 C88 109 98 115 91 119" />
        <path d="M104 74 C100 89 111 93 107 104 C103 113 111 117 108 121" />
        <path d="M124 63 C140 63 135 77 149 78 C159 79 153 93 165 96" />
        <path d="M119 69 C131 80 121 86 132 96 C140 103 132 111 143 115" />
        <path d="M112 73 C121 87 107 91 115 101 C121 109 111 115 118 119" />
        <path d="M105 74 C110 89 99 93 103 104 C107 113 99 117 102 121" />
      </g>
      <g fill={sucker} opacity=".9">
        <circle cx="53" cy="87" r="2.3" /><circle cx="48" cy="98" r="2.3" /><circle cx="76" cy="91" r="2.1" /><circle cx="68" cy="108" r="2.1" />
        <circle cx="93" cy="92" r="2.1" /><circle cx="92" cy="109" r="2.1" /><circle cx="109" cy="94" r="2.1" /><circle cx="108" cy="111" r="2.1" />
        <circle cx="163" cy="87" r="2.3" /><circle cx="168" cy="98" r="2.3" /><circle cx="140" cy="91" r="2.1" /><circle cx="148" cy="108" r="2.1" />
        <circle cx="122" cy="92" r="2.1" /><circle cx="123" cy="109" r="2.1" /><circle cx="106" cy="94" r="2.1" /><circle cx="107" cy="111" r="2.1" />
      </g>
      {/* Smooth, softly shaded head */}
      <path d="M73 61 C69 42 78 21 95 15 C107 10 121 11 132 17 C148 26 153 45 146 62 C139 72 125 77 109 77 C93 77 80 72 73 61Z" fill={isDark ? '#9b7bea' : '#8b65dc'} />
      <path d="M80 55 C77 39 85 25 99 20 C110 16 122 18 132 24 C143 32 146 47 140 59 C130 68 94 69 80 55Z" fill={isDark ? '#c7b6ff' : '#b69cf4'} opacity=".88" />
      <ellipse cx="97" cy="47" rx="7.5" ry="9.5" fill="#352649" />
      <ellipse cx="124" cy="47" rx="7.5" ry="9.5" fill="#352649" />
      {petted ? <g stroke="#352649" strokeWidth="2.2" strokeLinecap="round"><path d="M91 47 Q97 54 103 47" /><path d="M118 47 Q124 54 130 47" /></g> : <g fill="#fff"><circle cx="94.5" cy="43.5" r="2.7" /><circle cx="100" cy="50" r="1.25" /><circle cx="121.5" cy="43.5" r="2.7" /><circle cx="127" cy="50" r="1.25" /></g>}
      <path d={petted ? 'M102 57 Q110 66 118 57' : 'M103 57 Q110 64 117 57'} stroke="#69476e" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="82" cy="56" rx="7" ry="4" fill="#ff9bb9" opacity=".68" /><ellipse cx="138" cy="56" rx="7" ry="4" fill="#ff9bb9" opacity=".68" />
      <path d="M108 9 C105 5 101 7 104 11 L110 16 L116 10 C119 6 114 4 111 8 L110 9Z" fill="#ffe08a" />
      <circle cx="67" cy="43" r="2" fill="#f7d984" opacity=".88" /><circle cx="153" cy="44" r="1.6" fill="#f7d984" opacity=".88" />
      <path d="M72 30 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="#fff2b8" opacity=".9" />
      {petted && <path d="M153 24 l2 5 5 1 -5 2 -2 5 -2 -5 -5 -2 5 -1z" fill="#f5c765" />}
    </svg>
  </MascotFrame>;
}

export function JellyfishCompanion({ isDark, compact = false }) {
  const { petted, pet } = usePetReaction();
  const waveLine = isDark ? '#8de7fa' : '#56c9de';
  const tentacle = isDark ? '#bc9cff' : '#a987ef';
  return <MascotFrame label="jellyfish" isDark={isDark} petted={petted} pet={pet} compact={compact} noHoverLift>
    <svg className={`${compact ? 'h-24 w-40' : 'h-28 w-48'} overflow-visible drop-shadow-[0_9px_13px_rgba(81,54,133,.22)]`} viewBox="0 0 215 118" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="jellyOceanBack" x1="5" y1="75" x2="213" y2="118" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#42c6df' : '#72dce8'} stopOpacity={isDark ? '.09' : '.14'} />
          <stop offset=".55" stopColor={isDark ? '#55c8e6' : '#74c8ec'} stopOpacity={isDark ? '.19' : '.22'} />
          <stop offset="1" stopColor={isDark ? '#9a82eb' : '#ac91ed'} stopOpacity={isDark ? '.13' : '.15'} />
        </linearGradient>
        <linearGradient id="jellyOceanFront" x1="2" y1="89" x2="214" y2="118" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#67e4ed' : '#84e4e6'} stopOpacity={isDark ? '.15' : '.19'} />
          <stop offset="1" stopColor={isDark ? '#9883ee' : '#b29bee'} stopOpacity={isDark ? '.16' : '.17'} />
        </linearGradient>
        <linearGradient id="jellyBell" x1="79" y1="18" x2="143" y2="69" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#e0d5ff' : '#fff1ff'} />
          <stop offset=".38" stopColor={isDark ? '#bc9bff' : '#d3b9ff'} />
          <stop offset=".76" stopColor={isDark ? '#8a7df0' : '#a58ae8'} />
          <stop offset="1" stopColor={isDark ? '#64d5e9' : '#81d7eb'} />
        </linearGradient>
        <linearGradient id="jellyTentacle" x1="75" y1="64" x2="147" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#c2a8ff' : '#ae91f0'} />
          <stop offset="1" stopColor={isDark ? '#6de2ee' : '#72d7e8'} />
        </linearGradient>
        <radialGradient id="jellyAura" cx="0" cy="0" r="1" gradientTransform="matrix(0 48 -52 0 111 54)" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#a998ff' : '#c9a8ff'} stopOpacity={isDark ? '.38' : '.32'} />
          <stop offset="1" stopColor={isDark ? '#77e5f0' : '#94e7ef'} stopOpacity="0" />
        </radialGradient>
        <filter id="jellyGlow" x="49" y="-4" width="124" height="123" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <ellipse className="cf-jellyfish-aura" cx="110" cy="64" rx="55" ry="48" fill="url(#jellyAura)" />
      <g className="cf-wave-drift-slow">
        <path d="M3 80C21 67 38 67 57 79C77 92 94 92 114 80C135 67 153 67 174 80C190 90 202 89 213 82V118H3V80Z" fill="url(#jellyOceanBack)" />
        <path d="M2 78C20 65 38 65 57 77C76 89 95 90 115 77C135 64 154 65 174 78C190 88 202 88 214 80" stroke={waveLine} strokeWidth="1.5" strokeLinecap="round" opacity={isDark ? '.48' : '.42'} />
      </g>
      <g className="cf-wave-drift-fast">
        <path d="M2 93C21 84 38 84 56 94C73 104 88 105 105 96C124 85 141 83 160 93C179 103 196 101 214 91V118H2V93Z" fill="url(#jellyOceanFront)" />
        <path d="M1 91C20 82 38 82 57 92C74 102 89 103 106 94C125 83 143 81 161 91C180 101 197 99 214 89" stroke={waveLine} strokeWidth="1.2" strokeLinecap="round" opacity={isDark ? '.38' : '.34'} />
      </g>
      <g fill={waveLine} opacity={isDark ? '.6' : '.52'}>
        <circle cx="40" cy="62" r="2" /><circle cx="48" cy="51" r="1.25" /><circle cx="174" cy="64" r="1.8" /><circle cx="183" cy="52" r="1.2" />
      </g>
      <ellipse cx="109" cy="109" rx="38" ry="5" fill={isDark ? '#8b74cf' : '#c7b7e3'} opacity=".29" />
      {/* Fine, floating ribbons make the dangling tentacles distinct from octopus arms. */}
      <g className="cf-jellyfish-tentacles" stroke="url(#jellyTentacle)" strokeLinecap="round" fill="none">
        <path d="M84 62C84 73 74 77 80 87C86 96 77 103 75 111" strokeWidth="3.3" />
        <path d="M94 66C99 76 89 82 96 91C102 99 99 105 96 113" strokeWidth="3.6" />
        <path d="M103 68C107 79 102 84 108 94C114 103 109 108 109 114" strokeWidth="3.1" />
        <path d="M114 68C111 78 120 85 116 94C112 102 120 107 120 113" strokeWidth="3.3" />
        <path d="M124 66C120 77 132 82 126 91C120 100 130 105 135 111" strokeWidth="3.5" />
        <path d="M134 62C130 73 142 78 138 87C134 96 142 101 147 105" strokeWidth="3" />
      </g>
      <g fill={isDark ? '#e8dcff' : '#fff7ff'} opacity=".92">
        <circle cx="80" cy="91" r="1.2" /><circle cx="98" cy="95" r="1.2" /><circle cx="110" cy="98" r="1.1" />
        <circle cx="125" cy="94" r="1.2" /><circle cx="139" cy="91" r="1.15" />
      </g>
      {/* Soft glow under the translucent bell. */}
      <path className="cf-jellyfish-bell-glow" d="M72 60C70 34 85 14 110 14C135 14 150 34 148 60C144 57 141 57 137 63C133 69 126 69 122 63C118 57 112 57 108 63C104 69 98 69 94 63C90 57 84 57 80 63C77 66 74 64 72 60Z" fill={isDark ? '#a38aff' : '#bba1ff'} opacity=".76" filter="url(#jellyGlow)" />
      <path d="M72 60C70 34 85 14 110 14C135 14 150 34 148 60C144 57 141 57 137 63C133 69 126 69 122 63C118 57 112 57 108 63C104 69 98 69 94 63C90 57 84 57 80 63C77 66 74 64 72 60Z" fill="url(#jellyBell)" stroke={isDark ? '#eee5ff' : '#fffaff'} strokeWidth="1.6" />
      <path d="M82 49C82 32 93 21 108 19" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".65" />
      <path d="M91 55C99 61 122 62 132 55" stroke={isDark ? '#a38aff' : '#a58ae8'} strokeWidth="1.1" strokeLinecap="round" opacity=".58" />
      <ellipse cx="98" cy="46" rx="4.8" ry="6.6" fill="#302646" />
      <ellipse cx="122" cy="46" rx="4.8" ry="6.6" fill="#302646" />
      {petted ? <g stroke="#302646" strokeWidth="1.9" strokeLinecap="round"><path d="M94 46Q98 51 102 46" /><path d="M118 46Q122 51 126 46" /></g> : <g fill="#fff"><circle cx="96.5" cy="43.5" r="1.8" /><circle cx="120.5" cy="43.5" r="1.8" /></g>}
      <path d={petted ? 'M104 55Q110 61 116 55' : 'M105 55Q110 60 115 55'} stroke="#684971" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="86" cy="54" rx="5.3" ry="3.2" fill="#ff9fc5" opacity=".75" /><ellipse cx="134" cy="54" rx="5.3" ry="3.2" fill="#ff9fc5" opacity=".75" />
      <path d="M138 26l1.6 3.8 3.8 1.6-3.8 1.6-1.6 3.8-1.6-3.8-3.8-1.6 3.8-1.6z" fill="#fff2a8" />
      {petted && <path d="M156 35l1.7 4 4 1.7-4 1.7-1.7 4-1.7-4-4-1.7 4-1.7z" fill="#ffd7ee" />}
    </svg>
  </MascotFrame>;
}


