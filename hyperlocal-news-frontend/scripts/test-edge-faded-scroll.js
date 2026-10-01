// scripts/test-edge-faded-scroll.js
/**
 * Verification test for EdgeFadedScrollView logic across device viewports
 * (320x568, 360x640, 390x844) and large font scaling.
 */

function getTransparentColor(color) {
  if (!color) return 'transparent';
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0)`;
    }
  } else if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', ', 0)');
  } else if (color.startsWith('rgba(')) {
    return color.replace(/[\d\.]+\)$/, '0)');
  }
  return 'transparent';
}

function calculateFadeState(contentW, layoutW, scrollX) {
  if (layoutW <= 0) return { showLeft: false, showRight: false };

  const maxScroll = Math.max(0, contentW - layoutW);
  const canScroll = maxScroll > 2;

  const showLeft = canScroll && scrollX > 4;
  const showRight = canScroll && scrollX < maxScroll - 4;

  return { showLeft, showRight, maxScroll, canScroll };
}

let passed = 0;
let total = 0;
function assert(condition, name) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    process.exitCode = 1;
  }
}

console.log('--- 1. Color and Transparency Tests ---');
const darkSurface = '#13122A'; // Theme token for dark header
const lightSurface = '#FFFFFF'; // Theme token for light header
assert(getTransparentColor(darkSurface) === 'rgba(19, 18, 42, 0)', 'Dark surface #13122A converts to rgba(19, 18, 42, 0)');
assert(getTransparentColor(lightSurface) === 'rgba(255, 255, 255, 0)', 'Light surface #FFFFFF converts to rgba(255, 255, 255, 0)');

const viewports = [
  { name: 'Compact (320x568)', width: 320, paddingH: 16, chipContentW: 520, hashtagContentW: 430 },
  { name: 'Standard (360x640)', width: 360, paddingH: 16, chipContentW: 520, hashtagContentW: 430 },
  { name: 'Modern (390x844)', width: 390, paddingH: 16, chipContentW: 520, hashtagContentW: 430 },
  { name: 'Large System Font (360x640, 1.3x scale)', width: 360, paddingH: 16, chipContentW: 676, hashtagContentW: 559 },
  { name: 'Large System Font (320x568, 1.3x scale)', width: 320, paddingH: 16, chipContentW: 676, hashtagContentW: 559 },
];

for (const vp of viewports) {
  console.log(`\n--- 2. Viewport: ${vp.name} ---`);
  const availableChipW = vp.width - (vp.paddingH * 2);
  const trendingLabelW = 72; // "Trending:" flame + text
  const availableHashtagW = availableChipW - trendingLabelW;

  // Filter chips at start
  const chipStart = calculateFadeState(vp.chipContentW, availableChipW, 0);
  assert(chipStart.canScroll === true, 'Filter chips overflow viewport and can scroll');
  assert(chipStart.showLeft === false, 'Left fade hidden at scrollX=0');
  assert(chipStart.showRight === true, 'Right fade visible at scrollX=0 to indicate overflow');

  // Filter chips in middle
  const chipMid = calculateFadeState(vp.chipContentW, availableChipW, 50);
  assert(chipMid.showLeft === true, 'Left fade visible after scrolling right');
  assert(chipMid.showRight === true, 'Right fade visible in middle of scroll');

  // Filter chips at end
  const chipEnd = calculateFadeState(vp.chipContentW, availableChipW, chipStart.maxScroll);
  assert(chipEnd.showLeft === true, 'Left fade visible at end of scroll');
  assert(chipEnd.showRight === false, 'Right fade hidden at end so last chip is not dimmed');

  // Hashtags at start
  const hashStart = calculateFadeState(vp.hashtagContentW, availableHashtagW, 0);
  assert(hashStart.showLeft === false, 'Hashtags left fade hidden at start');
  assert(hashStart.showRight === true, 'Hashtags right fade visible at start');

  // Hashtags at end
  const hashEnd = calculateFadeState(vp.hashtagContentW, availableHashtagW, hashStart.maxScroll);
  assert(hashEnd.showRight === false, 'Hashtags right fade hidden at end');
}

console.log('\n--- 3. Short Content (No Scroll Needed) ---');
const shortContent = calculateFadeState(100, 320, 0);
assert(shortContent.canScroll === false, 'Content shorter than viewport detected');
assert(shortContent.showLeft === false, 'Left fade hidden for short content');
assert(shortContent.showRight === false, 'Right fade hidden for short content');

console.log(`\nTotal: ${passed}/${total} assertions passed.\n`);
