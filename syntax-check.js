const fs = require('fs');
const vm = require('vm');

try {
  const code = fs.readFileSync('./script.js', 'utf8');
  new vm.Script(code);
  console.log('✓ Syntax valid');
  process.exit(0);
} catch (e) {
  console.error('✗ Syntax error:', e.message);
  process.exit(1);
}
