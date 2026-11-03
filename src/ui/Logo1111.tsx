/** Логотип 11:11 — рисованный знак: четыре цветные цифры, кошачья морда вместо
 *  двоеточия, каракули. Собран вектором, поэтому масштабируется без потерь. */
const VB_W = 620
const VB_H = 300

import { useId } from 'react'

export function Logo1111({ height = 120 }: { height?: number }) {
  const filterId = `logo-rough-${useId().replace(/:/g, '')}`
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      height={height}
      width={height * (VB_W / VB_H)}
      role="img"
      aria-label="11:11"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id={filterId} x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#rough)">
      <path d="M 70 196 c -6 -8 -20 -6 -20 6 c 0 10 12 16 20 22 c 8 -6 20 -12 20 -22 c 0 -12 -14 -14 -20 -6" fill="#D22B2B" stroke="#131211" stroke-width="3"/><path d="M 84 234 c -4 -6 -14 -4 -14 4 c 0 7 8 11 14 15 c 6 -4 14 -8 14 -15 c 0 -8 -10 -10 -14 -4" fill="#2C6FD1" stroke="#131211" stroke-width="3"/><path d="M 150 50 l -10 -22 l 20 6" fill="#D22B2B" stroke="#131211" stroke-width="3" stroke-linejoin="round"/><path d="M 190 48 l 10 -24 l -20 8" fill="#D22B2B" stroke="#131211" stroke-width="3" stroke-linejoin="round"/><path d="M 296 74 l -14 -14 l 8 18 l -16 2 l 22 6" fill="#C6236E" stroke="#131211" stroke-width="3" stroke-linejoin="round"/><path d="M 338 70 l 14 -16 l -6 20 l 16 0 l -22 8" fill="#C6236E" stroke="#131211" stroke-width="3" stroke-linejoin="round"/><path d="M 414 118 l 4 -18 l 10 14 l 18 -2 l -14 12 l 4 18 l -14 -10 l -16 6 l 6 -14 l -12 -12 Z" fill="#E8892F" stroke="#131211" stroke-width="3" stroke-linejoin="round"/><path d="M 408 216 c 18 10 36 4 44 -10" fill="none" stroke="#131211" stroke-width="3" stroke-linecap="round"/>
      <g transform="rotate(-2.5 113.0 253)"><path d="M 96 253 L 130 251 L 133 82 L 117.7 54 L 98 66 Z" fill="#2C6FD1" stroke="#131211" stroke-width="5" stroke-linejoin="round"/><path d="M 115 86 L 113 234" stroke="rgba(255,255,255,.4)" stroke-width="4" stroke-linecap="round"/></g><g transform="rotate(1.5 175.0 252)"><path d="M 158 252 L 192 250 L 190 82 L 174.7 54 L 160 66 Z" fill="#D22B2B" stroke="#131211" stroke-width="5" stroke-linejoin="round"/><path d="M 177 86 L 175 234" stroke="rgba(255,255,255,.4)" stroke-width="4" stroke-linecap="round"/></g><g transform="rotate(-1.5 317.0 248)"><path d="M 300 248 L 334 246 L 336 83 L 320.7 55 L 302 67 Z" fill="#C6236E" stroke="#131211" stroke-width="5" stroke-linejoin="round"/><path d="M 319 87 L 317 234" stroke="rgba(255,255,255,.4)" stroke-width="4" stroke-linecap="round"/></g><g transform="rotate(2.5 379.0 253)"><path d="M 362 253 L 396 251 L 393 77 L 377.7 49 L 364 61 Z" fill="#E8892F" stroke="#131211" stroke-width="5" stroke-linejoin="round"/><path d="M 381 81 L 379 234" stroke="rgba(255,255,255,.4)" stroke-width="4" stroke-linecap="round"/></g>
      <g stroke="#131211" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M 208 146 C 208 108 284 108 284 146 C 284 186 208 186 208 146 Z" fill="#F4F0E8"/><path d="M 218 130 L 208 108 L 231 118" fill="#F4F0E8"/><path d="M 274 130 L 284 108 L 261 118" fill="#F4F0E8"/><circle cx="234" cy="146" r="3.2" fill="#131211" stroke="none"/><circle cx="258" cy="146" r="3.2" fill="#131211" stroke="none"/><path d="M 238 154 L 246 161 L 254 154" /><path d="M 222 154 L 201 149" /><path d="M 222 163 L 201 165" /><path d="M 270 154 L 291 149" /><path d="M 270 163 L 291 165" /></g>
    </g>
    </svg>
  )
}
