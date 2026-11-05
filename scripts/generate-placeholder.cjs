const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generate() {
  const width = 1200;
  const height = 675;

  const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
  const outputPath = path.join(__dirname, '..', 'assets', 'breaking-news-placeholder.png');

  // Resize and round the app logo
  const logoSize = 190;
  const logoRadius = 36;

  // Mask to round logo corners cleanly
  const maskSvg = Buffer.from(`
    <svg width="${logoSize}" height="${logoSize}">
      <rect width="${logoSize}" height="${logoSize}" rx="${logoRadius}" ry="${logoRadius}" fill="#FFF"/>
    </svg>
  `);

  const roundedLogoBuffer = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const logoX = Math.round((width - logoSize) / 2);
  const logoY = 150;

  // Background SVG with studio lighting, grids, breaking news typography and framing
  const backgroundSvg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Background Gradient -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#050816"/>
          <stop offset="50%" stop-color="#0c142e"/>
          <stop offset="100%" stop-color="#040612"/>
        </linearGradient>

        <!-- Logo Radial Ambient Glow -->
        <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#4648D4" stop-opacity="0.45"/>
          <stop offset="60%" stop-color="#4648D4" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#4648D4" stop-opacity="0"/>
        </radialGradient>

        <!-- Red Accent Glow -->
        <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#EF4444" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#EF4444" stop-opacity="0"/>
        </radialGradient>

        <!-- Breaking Badge Gradient -->
        <linearGradient id="breakingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#B91C1C"/>
          <stop offset="50%" stop-color="#DC2626"/>
          <stop offset="100%" stop-color="#991B1B"/>
        </linearGradient>

        <!-- Gold Border Gradient -->
        <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.8"/>
          <stop offset="50%" stop-color="#FDE047" stop-opacity="1"/>
          <stop offset="100%" stop-color="#F59E0B" stop-opacity="0.8"/>
        </linearGradient>

        <!-- Glass Overlay -->
        <linearGradient id="glassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.2"/>
          <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.03"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.15"/>
        </linearGradient>
      </defs>

      <!-- Main Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>

      <!-- News Studio Concentric Radar Circles -->
      <g stroke="#38BDF8" stroke-opacity="0.08" fill="none">
        <circle cx="600" cy="245" r="160" stroke-width="1.2"/>
        <circle cx="600" cy="245" r="230" stroke-width="1" stroke-dasharray="6,6"/>
        <circle cx="600" cy="245" r="310" stroke-width="1.2"/>
        <circle cx="600" cy="245" r="390" stroke-width="1" stroke-dasharray="4,8"/>
        <circle cx="600" cy="245" r="480" stroke-width="1"/>
      </g>

      <!-- Studio Grid Dots/Crosshairs -->
      <g fill="#818CF8" fill-opacity="0.12">
        <circle cx="120" cy="90" r="3"/>
        <circle cx="1080" cy="90" r="3"/>
        <circle cx="120" cy="585" r="3"/>
        <circle cx="1080" cy="585" r="3"/>
        <circle cx="300" cy="245" r="2"/>
        <circle cx="900" cy="245" r="2"/>
      </g>

      <!-- Ambient Glow Behind Logo -->
      <ellipse cx="600" cy="245" rx="320" ry="220" fill="url(#logoGlow)"/>
      <ellipse cx="600" cy="425" rx="350" ry="120" fill="url(#redGlow)"/>

      <!-- Outer Logo Card Shadow / Border Accent -->
      <rect x="${logoX - 8}" y="${logoY - 8}" width="${logoSize + 16}" height="${logoSize + 16}" rx="42" ry="42" fill="#0C132C" stroke="#4648D4" stroke-width="2" stroke-opacity="0.35"/>

      <!-- ================= BREAKING NEWS BANNER ================= -->
      <g transform="translate(600, 420)">
        <!-- Outer Glow Card -->
        <rect x="-240" y="-34" width="480" height="68" rx="20" ry="20" fill="url(#breakingGrad)" stroke="url(#goldBorder)" stroke-width="2.5"/>
        
        <!-- Subtle Top Highlight / Gloss -->
        <rect x="-238" y="-32" width="476" height="32" rx="18" ry="18" fill="url(#glassGloss)"/>

        <!-- Pulsing Red/White Live Dot -->
        <circle cx="-185" cy="0" r="10" fill="#FFFFFF" fill-opacity="0.3"/>
        <circle cx="-185" cy="0" r="6" fill="#FFFFFF"/>

        <!-- BREAKING NEWS Text -->
        <text x="12" y="11" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="4.5">BREAKING NEWS</text>
      </g>

      <!-- App Sub-Label / Tagline -->
      <g transform="translate(600, 498)">
        <text x="0" y="0" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="16" font-weight="700" fill="#94A3B8" text-anchor="middle" letter-spacing="6">CITY NEWS TELUGU</text>
      </g>

      <!-- Top Header Studio Bar -->
      <rect x="0" y="0" width="${width}" height="6" fill="#4648D4" fill-opacity="0.8"/>

      <!-- Bottom Broadcast Ticker Accent Bar -->
      <g transform="translate(0, ${height - 52})">
        <rect x="0" y="0" width="${width}" height="52" fill="#030611" fill-opacity="0.85"/>
        <line x1="0" y1="0" x2="${width}" y2="0" stroke="#DC2626" stroke-width="3.5"/>
        <rect x="0" y="0" width="160" height="4" fill="#F59E0B"/>
        <text x="600" y="32" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="600" fill="#64748B" text-anchor="middle" letter-spacing="3">24x7 VERIFIED HYPERLOCAL COVERAGE</text>
      </g>
    </svg>
  `);

  // Composite background with the rounded app logo
  const finalImage = await sharp(backgroundSvg)
    .composite([
      {
        input: roundedLogoBuffer,
        top: logoY,
        left: logoX,
      },
    ])
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(outputPath);

  console.log('Successfully generated breaking news placeholder image at:', outputPath);
  console.log('Image details:', finalImage);
}

generate().catch(console.error);

