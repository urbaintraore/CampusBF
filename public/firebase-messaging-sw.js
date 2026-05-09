importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "gen-lang-client-0419994768",
  appId: "1:75173710143:web:ea5f1e20bfcef62805ab8a",
  apiKey: "AIzaSyAlUUD7Ll5dG2WWizoZo7fGUfrQ-nHjPao",
  authDomain: "gen-lang-client-0419994768.firebaseapp.com",
  messagingSenderId: "75173710143"
});

const messaging = firebase.messaging();
