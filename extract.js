const fs = require('fs');
const content = fs.readFileSync('C:/Users/moksh/.gemini/antigravity/scratch/index.html', 'utf8');

const startMarker = '// Inline model data — no external file fetch needed';
const endMarker = '</script>\n</head>';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex > -1 && endIndex > -1) {
  const before = content.substring(0, startIndex);
  const dataString = content.substring(startIndex, endIndex);
  const after = content.substring(endIndex);
  
  fs.writeFileSync('C:/Users/moksh/.gemini/antigravity/scratch/model_data.js', dataString);
  fs.writeFileSync('C:/Users/moksh/.gemini/antigravity/scratch/index.html', before + '<script src="model_data.js"></script>\n' + after);
  console.log('Successfully extracted model_data.js');
} else {
  console.log('Markers not found');
}
