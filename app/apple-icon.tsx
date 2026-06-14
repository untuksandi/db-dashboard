import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: 'linear-gradient(135deg, #0F3D4F 0%, #1a6b6b 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: '-2px',
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          PSG
        </span>
        <span
          style={{
            color: '#7dd3c8',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '0px',
            fontFamily: 'sans-serif',
            lineHeight: 1.2,
          }}
        >
          consulting
        </span>
      </div>
    ),
    { ...size }
  )
}
