async function test() {
  const form = new FormData();
  form.append('file', new Blob(['hello world']), 'test.txt');
  
  try {
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: form
    });
    console.log(res.status, res.statusText);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
test();
