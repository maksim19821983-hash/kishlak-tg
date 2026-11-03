/** Логотип 11:11 — рисованный знак: четыре цветные цифры, кошачья морда вместо
 *  двоеточия, каракули. Контуры с дрожью заложены в path, без SVG-фильтров:
 *  feTurbulence не отрисовывается в WKWebView Телеграма. */
const VB_X = 38
const VB_Y = 16
const VB_W = 428
const VB_H = 252

export function Logo1111({ height = 120 }: { height?: number }) {
  return (
    <svg
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      height={height}
      width={height * (VB_W / VB_H)}
      role="img"
      aria-label="11:11"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <g>
      <path d="M 150.0 50.0 L 144.4 39.3 L 140.0 28.0 L 150.0 30.9 L 160.0 34.0 L 154.9 42.0 Z" fill="#D22B2B" stroke="#131211" stroke-width="3" stroke-linejoin="round"/><path d="M 190.0 48.0 L 195.6 36.2 L 200.0 24.0 L 189.8 27.5 L 180.0 32.0 L 184.5 40.3 Z" fill="#D22B2B" stroke="#131211" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 296.0 74.0 L 288.7 67.3 L 282.0 60.0 L 286.1 68.9 L 290.0 78.0 L 282.0 79.2 L 274.0 80.0 L 284.8 83.6 L 296.0 86.0 L 296.7 80.0 Z" fill="#C6236E" stroke="#131211" stroke-width="3" stroke-linejoin="round"/><path d="M 338.0 70.0 L 344.6 61.6 L 352.0 54.0 L 349.5 64.1 L 346.0 74.0 L 354.0 73.6 L 362.0 74.0 L 351.1 78.4 L 340.0 82.0 L 339.0 76.0 Z" fill="#C6236E" stroke="#131211" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 70.0 214.0 L 59.5 206.6 L 50.0 198.0 L 54.4 189.4 L 59.0 181.0 L 64.6 186.4 L 70.0 192.0 L 75.6 186.6 L 81.0 181.0 L 84.9 189.8 L 90.0 198.0 L 79.8 205.8 Z" fill="#D22B2B" stroke="#131211" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 84.0 247.5 L 76.5 241.5 L 69.0 235.5 L 72.5 229.2 L 75.8 222.8 L 79.7 227.1 L 84.0 231.0 L 87.6 226.4 L 92.2 222.8 L 95.1 229.4 L 99.0 235.5 L 91.2 241.2 Z" fill="#2C6FD1" stroke="#131211" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 420.0 98.0 L 422.5 105.7 L 426.0 113.0 L 433.0 113.9 L 440.0 114.0 L 434.6 118.6 L 429.0 123.0 L 430.8 130.5 L 432.4 138.0 L 425.9 133.4 L 420.0 128.0 L 413.7 132.9 L 407.6 138.0 L 408.7 130.4 L 411.0 123.0 L 405.1 119.0 L 400.0 114.0 L 407.0 113.1 L 414.0 113.0 L 416.6 105.3 Z" fill="#E8892F" stroke="#131211" stroke-width="3" stroke-linejoin="round"/>
      <g transform="rotate(-2.5 113 247)"><path d="M 96.0 247.0 L 107.3 246.0 L 118.6 244.3 L 130.0 245.0 L 132.0 190.0 L 130.8 135.0 L 133.0 80.0 L 128.1 70.5 L 123.9 60.7 L 117.7 52.0 L 111.6 56.7 L 105.2 61.1 L 98.0 64.0 L 97.6 125.0 L 97.4 186.0 Z" fill="#2C6FD1" stroke="#131211" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M 115.0 84.0 L 113.9 157.5 L 113.0 231.0" stroke="rgba(255,255,255,.38)" stroke-width="4" stroke-linecap="round" fill="none"/></g><g transform="rotate(1.5 175 246)"><path d="M 158.0 246.0 L 169.4 246.7 L 180.7 245.1 L 192.0 244.0 L 191.6 187.7 L 189.4 131.3 L 190.0 75.0 L 185.1 65.5 L 178.6 57.0 L 174.7 47.0 L 170.3 51.6 L 164.8 54.9 L 160.0 59.0 L 160.4 121.3 L 158.9 183.7 Z" fill="#D22B2B" stroke="#131211" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M 177.0 79.0 L 175.9 154.5 L 175.0 230.0" stroke="rgba(255,255,255,.38)" stroke-width="4" stroke-linecap="round" fill="none"/></g><g transform="rotate(-1.5 317 249)"><path d="M 300.0 249.0 L 311.3 248.5 L 322.7 248.2 L 334.0 247.0 L 333.5 192.7 L 335.5 138.3 L 336.0 84.0 L 330.1 75.1 L 324.7 65.9 L 320.7 56.0 L 314.1 59.5 L 308.1 63.8 L 302.0 68.0 L 301.0 128.3 L 300.7 188.7 Z" fill="#C6236E" stroke="#131211" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M 319.0 88.0 L 317.9 160.5 L 317.0 233.0" stroke="rgba(255,255,255,.38)" stroke-width="4" stroke-linecap="round" fill="none"/></g><g transform="rotate(2.5 379 252)"><path d="M 362.0 252.0 L 373.3 251.6 L 384.7 250.5 L 396.0 250.0 L 394.4 193.3 L 394.9 136.7 L 393.0 80.0 L 388.4 70.4 L 382.1 61.7 L 377.7 52.0 L 373.0 55.8 L 368.5 59.9 L 364.0 64.0 L 362.2 126.7 L 362.0 189.3 Z" fill="#E8892F" stroke="#131211" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M 381.0 84.0 L 380.5 160.0 L 379.0 236.0" stroke="rgba(255,255,255,.38)" stroke-width="4" stroke-linecap="round" fill="none"/></g>
      <g stroke="#131211" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M 285.0 146.0 L 282.2 154.9 L 279.5 163.6 L 274.8 171.5 L 267.2 176.7 L 259.5 181.5 L 250.5 182.8 L 241.4 184.1 L 232.3 182.0 L 224.3 177.4 L 217.0 171.7 L 212.7 163.5 L 208.7 155.2 L 207.8 146.0 L 208.9 136.9 L 212.4 128.4 L 217.0 120.4 L 223.9 114.0 L 232.5 110.5 L 241.4 108.0 L 250.5 109.1 L 259.6 110.1 L 267.8 114.5 L 275.2 120.1 L 280.2 128.0 L 282.5 137.0 Z" fill="#F4F0E8"/><path d="M 218.0 130.0 L 212.8 118.1 L 208.0 106.0 L 219.9 112.3 L 232.0 118.0 L 225.6 124.7 Z" fill="#F4F0E8"/><path d="M 274.0 130.0 L 278.9 118.0 L 284.0 106.0 L 272.3 112.5 L 260.0 118.0 L 267.4 123.5 Z" fill="#F4F0E8"/><circle cx="234" cy="146" r="3.2" fill="#131211" stroke="none"/><circle cx="258" cy="146" r="3.2" fill="#131211" stroke="none"/><path d="M 238.0 154.0 L 242.3 157.1 L 246.0 161.0"/><path d="M 246.0 161.0 L 250.2 157.7 L 254.0 154.0"/><path d="M 222.0 154.0 L 211.3 152.2 L 201.0 149.0"/><path d="M 222.0 163.0 L 211.5 164.5 L 201.0 165.0"/><path d="M 270.0 154.0 L 280.4 151.3 L 291.0 149.0"/><path d="M 270.0 163.0 L 280.4 164.7 L 291.0 165.0"/></g>
      <path d="M 408.0 216.0 L 422.7 213.0 L 437.1 208.4 L 452.0 206.0" fill="none" stroke="#131211" stroke-width="3" stroke-linecap="round"/>
    </g>
    </svg>
  )
}
