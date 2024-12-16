// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3JiubVIgIC6oSwmFS6Wv3fmNtNZq_oNw",
  authDomain: "secret-santa-73675.firebaseapp.com",
  projectId: "secret-santa-73675",
  storageBucket: "secret-santa-73675.firebasestorage.app",
  messagingSenderId: "2433759746",
  appId: "1:2433759746:web:8a2af02e26472a73e8c51b",
  measurementId: "G-PQ4FDEY52L",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const createSection = document.getElementById("create-section");
const listSection = document.getElementById("list-section");
const nameList = document.getElementById("name-list");
const recipientInfo = document.getElementById("recipient-info");
const pinInfo = document.getElementById("pin-info");
const createBtn = document.getElementById("create-btn");
const namesInput = document.getElementById("names");

let currentListId = null;

// Shuffle Array Helper Function (s kontrolou)
function shuffleAndAssign(names) {
    let shuffled;
    let isValid = false;
  
    // Opakuj, dokud nikdo není přiřazen sám sobě
    while (!isValid) {
      shuffled = [...names];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
  
      // Ověř, že nikdo není přiřazen sám sobě
      isValid = shuffled.every((recipient, index) => recipient !== names[index]);
    }
  
    return shuffled;
  }
// Create a New List and Assign Recipients
createBtn.addEventListener("click", async () => {
    const names = namesInput.value.split("\n").map(name => name.trim()).filter(name => name);
    if (names.length < 2) {
      alert("You need at least two names!");
      return;
    }
  
    try {
      // Vytvoření seznamu v Firestore
      const listRef = await db.collection("lists").add({ createdAt: new Date() });
      currentListId = listRef.id;
  
      // Získej zamíchané obdarované, kde nikdo nemá sám sebe
      const shuffledNames = shuffleAndAssign(names);
  
      // Přiřaď obdarované a ulož je do Firestore
      const promises = names.map((name, index) => {
        const recipient = shuffledNames[index];
        return db.collection(`lists/${currentListId}/names`).add({
          name,
          assignedTo: recipient,
          pin: Math.floor(1000 + Math.random() * 9000), // Náhodný PIN
          pinViewed: false, // PIN ještě nebyl zobrazen
        });
      });
  
      await Promise.all(promises);
  
      // Zobraz seznam a odkaz na sdílení
      showListWithLink(currentListId);
    } catch (error) {
      console.error("Error creating list:", error);
      alert("An error occurred while creating the list.");
    }
  });
  
  // Show List and Sharing Link
  async function showListWithLink(listId) {
    createSection.classList.add("hidden");
    listSection.classList.remove("hidden");
  
    // Nastav odkaz na seznam
    const listUrl = `${location.origin}?list=${listId}`;
    const listLinkElement = document.getElementById("list-link");
    const listUrlElement = document.getElementById("list-url");
  
    listUrlElement.href = listUrl;
    listUrlElement.textContent = listUrl;
    listLinkElement.classList.remove("hidden");
  
    // Načti seznam jmen
    await loadList(listId);
  }

// Show Recipient without PIN if already stored in localStorage
function showRecipient(data, docId) {
    const storedId = localStorage.getItem(`clickedName_${currentListId}`);
  
    // Pokud jméno již bylo vybráno v tomto prohlížeči, rovnou zobraz informace
    if (storedId === docId) {
      recipientInfo.textContent = `You are giving a gift to: ${data.assignedTo}`;
      pinInfo.textContent = ""; // PIN již nezobrazujeme
      recipientInfo.classList.remove("hidden");
      pinInfo.classList.add("hidden");
    } else if (!data.pinViewed) {
      // Zobraz příjemce a PIN (pouze při prvním otevření)
      recipientInfo.textContent = `You are giving a gift to: ${data.assignedTo}`;
      pinInfo.textContent = `Your PIN is: ${data.pin}`;
      recipientInfo.classList.remove("hidden");
      pinInfo.classList.remove("hidden");
  
      // Nastav ve Firestore, že PIN byl zobrazen
      db.collection(`lists/${currentListId}/names`).doc(docId).update({ pinViewed: true });
  
      // Ulož do localStorage ID kliknutého jména
      localStorage.setItem(`clickedName_${currentListId}`, docId);
    } else {
      // Zobraz formulář pro zadání PINu
      const pinPrompt = prompt("Please enter your PIN:");
      if (pinPrompt === data.pin.toString()) {
        // Pokud PIN sedí, zobraz příjemce
        recipientInfo.textContent = `You are giving a gift to: ${data.assignedTo}`;
        pinInfo.textContent = ""; // PIN již nezobrazujeme
        recipientInfo.classList.remove("hidden");
        pinInfo.classList.add("hidden");
  
        // Ulož do localStorage ID kliknutého jména
        localStorage.setItem(`clickedName_${currentListId}`, docId);
      } else {
        alert("Incorrect PIN. Please try again.");
        return; // Ukončete funkci, pokud PIN nesedí
      }
    }
  
    // Skryj ostatní jména (po kliknutí na konkrétní jméno)
    nameList.innerHTML = "";
    const listItem = document.createElement("div");
    listItem.textContent = data.name;
    listItem.className = "list-item";
    nameList.appendChild(listItem);
  }
  
// Load a List by ID
async function loadList(listId) {
    try {
      createSection.classList.add("hidden");
      listSection.classList.remove("hidden");
  
      // Nastav odkaz na seznam
      const listUrl = `${location.origin}?list=${listId}`;
      const listLinkElement = document.getElementById("list-link");
      const listUrlElement = document.getElementById("list-url");
  
      listUrlElement.href = listUrl;
      listUrlElement.textContent = listUrl;
      listLinkElement.classList.remove("hidden");
  
      // Načti seznam jmen
      const namesSnapshot = await db.collection(`lists/${listId}/names`).get();
      nameList.innerHTML = "";
  
      const clickedNameId = localStorage.getItem(`clickedName_${listId}`);
  
      if (clickedNameId) {
        // Pokud uživatel již klikl na jméno, zobraz pouze toto jméno
        const clickedDoc = namesSnapshot.docs.find(doc => doc.id === clickedNameId);
        if (clickedDoc) {
          const data = clickedDoc.data();
          showRecipient(data, clickedDoc.id);
        }
      } else {
        // Jinak zobraz všechna jména
        namesSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          const listItem = document.createElement("div");
          listItem.textContent = data.name;
          listItem.className = "list-item";
          listItem.addEventListener("click", () => showRecipient(data, docSnap.id));
          nameList.appendChild(listItem);
        });
      }
    } catch (error) {
      console.error("Error loading list:", error);
      alert("An error occurred while loading the list.");
    }
  }

// Check URL for existing list
const params = new URLSearchParams(location.search);
if (params.has("list")) {
  currentListId = params.get("list");
  loadList(currentListId);
}
