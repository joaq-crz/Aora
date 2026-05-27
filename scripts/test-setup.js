// Quick setup verification script
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Multi-Persona AI Sales Agent Setup...\n');

const checks = [];

// Check 1: Required files exist
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'data/persona.md',
  'data/archetype_type.md',
  'src/app/api/chat/completions/route.ts',
  'src/services/analyzer.ts',
  'src/services/profileManager.ts',
  'src/services/promptCompiler.ts',
  'src/services/evolutionWorker.ts',
  'src/services/vertexGemini.ts',
  'src/types/chat.ts',
  'src/utils/agoraConfig.ts',
  'src/app/page.tsx',
  'src/app/layout.tsx'
];

console.log('📁 Checking required files...');
let allFilesExist = true;
for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  if (exists) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}
checks.push({ name: 'Required Files', passed: allFilesExist });

// Check 2: Required directories exist
console.log('\n📂 Checking directories...');
const requiredDirs = [
  'data/profiles',
  'src/app/api/chat/completions',
  'src/services',
  'src/types',
  'src/utils'
];

let allDirsExist = true;
for (const dir of requiredDirs) {
  const exists = fs.existsSync(path.join(__dirname, '..', dir));
  if (exists) {
    console.log(`  ✅ ${dir}`);
  } else {
    console.log(`  ❌ ${dir} - MISSING`);
    allDirsExist = false;
  }
}
checks.push({ name: 'Required Directories', passed: allDirsExist });

// Check 3: Environment variables
console.log('\n🔐 Checking environment configuration...');
const envExample = fs.existsSync(path.join(__dirname, '..', '.env.local.example'));
const envLocal = fs.existsSync(path.join(__dirname, '..', '.env.local'));

if (envExample) {
  console.log('  ✅ .env.local.example exists');
} else {
  console.log('  ❌ .env.local.example missing');
}

if (envLocal) {
  console.log('  ✅ .env.local exists');
  
  // Check if keys are configured
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
  const hasVertex =
    envContent.includes('GOOGLE_CLOUD_PROJECT=') &&
    !envContent.includes('your-gcp-project-id');
  const hasAgora = envContent.includes('NEXT_PUBLIC_AGORA_APP_ID=') && !envContent.includes('your_agora_app_id_here');
  
  if (hasVertex) {
    console.log('  ✅ Vertex AI (GOOGLE_CLOUD_PROJECT) configured');
  } else {
    console.log('  ⚠️  Vertex AI project not configured (GOOGLE_CLOUD_PROJECT)');
  }
  
  if (hasAgora) {
    console.log('  ✅ Agora App ID configured');
  } else {
    console.log('  ⚠️  Agora App ID not configured');
  }
  
  checks.push({ name: 'Environment Variables', passed: hasVertex && hasAgora });
} else {
  console.log('  ⚠️  .env.local not found - copy from .env.local.example');
  checks.push({ name: 'Environment Variables', passed: false });
}

// Check 4: Node modules
console.log('\n📦 Checking dependencies...');
const nodeModulesExists = fs.existsSync(path.join(__dirname, '..', 'node_modules'));
if (nodeModulesExists) {
  console.log('  ✅ node_modules exists');
  checks.push({ name: 'Dependencies Installed', passed: true });
} else {
  console.log('  ❌ node_modules not found - run: npm install');
  checks.push({ name: 'Dependencies Installed', passed: false });
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SETUP VERIFICATION SUMMARY');
console.log('='.repeat(50));

const passedChecks = checks.filter(c => c.passed).length;
const totalChecks = checks.length;

checks.forEach(check => {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
});

console.log('\n' + '='.repeat(50));
if (passedChecks === totalChecks) {
  console.log('🎉 All checks passed! You\'re ready to go!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run dev');
  console.log('  2. Open: http://localhost:3000');
  console.log('  3. Test with: "Hello broskie"');
} else {
  console.log(`⚠️  ${totalChecks - passedChecks} check(s) failed`);
  console.log('\nPlease fix the issues above before running the app.');
  console.log('See SETUP.md for detailed instructions.');
}
console.log('='.repeat(50) + '\n');
