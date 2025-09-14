

export const getTokenImageUrl = (symbol: string, mintAddress: string): string => {
  
  const colors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-blue-600', 
    'from-yellow-500 to-orange-600',
    'from-pink-500 to-red-600',
    'from-indigo-500 to-purple-600',
    'from-teal-500 to-green-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
  ];
  
  
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % colors.length;
  
  
  const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http:
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#${getColorFromClass(colors[colorIndex]).start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#${getColorFromClass(colors[colorIndex]).end};stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#grad)" stroke="#ffffff" stroke-width="2"/>
      <text x="32" y="38" font-family="Arial, sans-serif" font-size="16" font-weight="bold" 
            text-anchor="middle" fill="white">${symbol.slice(0, 3).toUpperCase()}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

function getColorFromClass(className: string): { start: string; end: string } {
  const colorMap: Record<string, { start: string; end: string }> = {
    'from-blue-500 to-purple-600': { start: '3B82F6', end: '9333EA' },
    'from-green-500 to-blue-600': { start: '10B981', end: '2563EB' },
    'from-yellow-500 to-orange-600': { start: 'EAB308', end: 'EA580C' },
    'from-pink-500 to-red-600': { start: 'EC4899', end: 'DC2626' },
    'from-indigo-500 to-purple-600': { start: '6366F1', end: '9333EA' },
    'from-teal-500 to-green-600': { start: '14B8A6', end: '059669' },
    'from-orange-500 to-red-600': { start: 'F97316', end: 'DC2626' },
    'from-cyan-500 to-blue-600': { start: '06B6D4', end: '2563EB' },
  };
  
  return colorMap[className] || { start: '3B82F6', end: '9333EA' };
}

export const getDefaultNFTImage = (name: string): string => {
  
  const svg = `
    <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http:
      <defs>
        <linearGradient id="nftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667EEA;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764BA2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="url(#nftGrad)"/>
      <rect x="20" y="20" width="260" height="260" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
      <circle cx="150" cy="120" r="40" fill="white" opacity="0.2"/>
      <rect x="100" y="180" width="100" height="60" rx="10" fill="white" opacity="0.2"/>
      <text x="150" y="280" font-family="Arial, sans-serif" font-size="14" font-weight="bold" 
            text-anchor="middle" fill="white" opacity="0.8">${name.slice(0, 20)}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};