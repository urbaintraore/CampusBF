const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const cacheHelpers = `
async function fetchWithSessionCache(cacheKey: string, q: any) {
  const cached = sessionStorage.getItem(cacheKey);
  const cacheTime = sessionStorage.getItem(cacheKey + '_time');
  const now = Date.now();
  // Cache valide pour 30 minutes (1800000 ms)
  if (cached && cacheTime && now - parseInt(cacheTime) < 1800000) {
    return JSON.parse(cached);
  }
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    sessionStorage.setItem(cacheKey + '_time', now.toString());
  } catch (e) {
    // Ignorer en cas de quota dépassé localement
  }
  return data;
}

async function fetchCountWithSessionCache(cacheKey: string, ref: any) {
  const cached = sessionStorage.getItem(cacheKey);
  const cacheTime = sessionStorage.getItem(cacheKey + '_time');
  const now = Date.now();
  if (cached && cacheTime && now - parseInt(cacheTime) < 1800000) return parseInt(cached);
  
  // Importer dynamiquement pour éviter un chargement inutile si pas besoin
  const { getCountFromServer } = await import('firebase/firestore');
  const snapshot = await getCountFromServer(ref);
  const count = snapshot.data().count;
  try {
    sessionStorage.setItem(cacheKey, count.toString());
    sessionStorage.setItem(cacheKey + '_time', now.toString());
  } catch (e) {}
  return count;
}
`;

// Inject helpers at the top level
if (!content.includes('fetchWithSessionCache')) {
   const lastImportIndex = content.lastIndexOf('import ');
   const endOfLine = content.indexOf('\n', lastImportIndex);
   content = content.slice(0, endOfLine + 1) + cacheHelpers + content.slice(endOfLine + 1);
}

// Process counts
content = content.replace(/getCountFromServer\((.*?)\)\.then\(snapshot => \{\s*set([A-Za-z0-9_]+)\(snapshot\.data\(\)\.count\);\s*\}\)\.catch\(e => console\.error\(e\)\);/gs,
  (match, ref, setterName) => {
    return `fetchCountWithSessionCache('cache_count_${setterName}', ${ref}).then(count => set${setterName}(count)).catch(e => console.error(e));`;
  }
);

// Process getDocs with type castings
content = content.replace(/getDocs\(([\s\S]*?)\)\.then\(snapshot => \{\s*set([A-Za-z0-9_]+)\(snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}(?: as ([A-Za-z0-9_]+))?\)\)\);\s*\}\);/gs,
  (match, q, setterName, typeName) => {
    const typeCast = typeName ? ` as ${typeName}[]` : ' as any[]';
    return `fetchWithSessionCache('cache_${setterName}', ${q}).then(data => set${setterName}(data${typeCast}));`;
  }
);

fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("Caching applied");
