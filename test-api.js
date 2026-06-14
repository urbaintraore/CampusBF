fetch('http://localhost:3000/api/public-service/save-contest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    generatedContest: { titre: 'Test', description: 'Test', questions: [] },
    config: { category: 'culture_generale', level: 'BAC' },
    status: 'published'
  })
}).then(res => res.json().then(data => console.log(res.status, data))).catch(console.error);
