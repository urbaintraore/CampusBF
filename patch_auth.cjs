const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// Replace standard collections
content = content.replace(/unsubscribes\.push\(onSnapshot\(query\(collection\(db, '([^']+)'\).*?limit\((\d+)\)\), \(snapshot\) => \{\n\s+set([A-Za-z]+)\(snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}(.*?)?\)\)\);\n\s+\}\)\);/g, 
  "getDocs(query(collection(db, '$1'), limit($2))).then(snapshot => {\n      set$3(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }$4)));\n    });");

// Replace user query
content = content.replace(/unsubscribes\.push\(onSnapshot\(usersQuery, \(snapshot\) => \{\n\s+setUsers\(snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \} as User\)\)\);\n\s+\}\)\);/g,
  "getDocs(usersQuery).then(snapshot => {\n      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));\n    });");

// Replace motoRides, marketplace, trainings
content = content.replace(/unsubscribes\.push\(onSnapshot\((marketplaceQuery|motoRideQuery|trainingsQuery), \(snapshot\) => \{\n\s+set([A-Za-z]+)\(snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}(.*?)?\)\)\);\n\s+\}\)\);/g,
  "getDocs($1).then(snapshot => {\n      set$2(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }$3)));\n    });");

// Replace applications, teacherApps
content = content.replace(/unsubscribes\.push\(onSnapshot\((qApps|qTeacherApps), \(snapshot\) => \{\n\s+set([A-Za-z]+)\(snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}(.*?)?\)\)\);\n\s+\}\)\);/g,
  "getDocs($1).then(snapshot => {\n      set$2(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }$3)));\n    });");

// Also training_reports array etc which has orderBy
content = content.replace(/unsubscribes\.push\(onSnapshot\(query\(collection\(db, 'logs'\), orderBy\('timestamp', 'desc'\), limit\(100\)\), \(snapshot\) => \{\n\s+setLogs\(snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \} as Log\)\)\);\n\s+\}\)\);/g,
  "getDocs(query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100))).then(snapshot => {\n        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log)));\n      });");


fs.writeFileSync('src/context/AuthContext.tsx', content);
