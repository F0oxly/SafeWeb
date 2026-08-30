import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SecurityAnalyzer } from '../extension/services/security-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testCasesPath = path.join(__dirname, 'test-cases.json');
const testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));

console.log('='.repeat(65));
console.log('SafeWeb - Execução dos Testes Automatizados de URLs');
console.log('='.repeat(65));

let passedCount = 0;
let totalCount = testCases.length;

testCases.forEach((test, index) => {
  const result = SecurityAnalyzer.analyze(test.url);
  const passedLevel = result.level === test.expectedLevel;

  console.log(`\n[Teste #${index + 1}] Categoria: ${test.category}`);
  console.log(`URL: ${test.url}`);
  console.log(`Nível Esperado: ${test.expectedLevel} | Nível Obtido: ${result.level} (${result.label})`);
  console.log(`Score de Risco: ${result.score}/100`);
  
  if (result.reasons && result.reasons.length > 0) {
    console.log(`⚠️  Motivos identificados:`);
    result.reasons.forEach(r => console.log(`   - ${r}`));
  }

  if (passedLevel) {
    console.log(`✅ RESULTADO: APROVADO`);
    passedCount++;
  } else {
    console.log(`❌ RESULTADO: DIVERGÊNCIA (Esperava ${test.expectedLevel}, obteve ${result.level})`);
  }
});

console.log('\n' + '='.repeat(65));
console.log(`📈 RESUMO DOS TESTES: ${passedCount}/${totalCount} Aprovados (${Math.round((passedCount/totalCount)*100)}%)`);
console.log('='.repeat(65));
