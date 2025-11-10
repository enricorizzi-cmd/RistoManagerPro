# Guida all'Uso del DOM in React

Questa guida spiega come utilizzare le funzioni DOM nel progetto RistoManagerPro, seguendo le best practice di React.

## Indice

1. [useRef - Riferimenti agli Elementi DOM](#useref)
2. [Event Listeners](#event-listeners)
3. [Manipolazione DOM Diretta](#manipolazione-dom-diretta)
4. [Esempi Pratici dal Codice](#esempi-pratici)

---

## useRef - Riferimenti agli Elementi DOM

`useRef` è il modo **corretto e React-friendly** per accedere agli elementi DOM.

### Sintassi Base

```typescript
import { useRef } from 'react';

const MyComponent = () => {
  // Crea un riferimento
  const elementRef = useRef<HTMLDivElement>(null);

  // Usa il riferimento nel JSX
  return <div ref={elementRef}>Contenuto</div>;
};
```

### Esempio 1: Focus su Input (SearchableSelect.tsx)

```typescript
import { useRef, useEffect } from 'react';

const SearchableSelect = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Focus automatico quando si apre il dropdown
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Cerca..."
    />
  );
};
```

### Esempio 2: Scroll Automatico (Chatbot.tsx)

```typescript
import { useRef, useEffect } from 'react';

const Chatbot = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState([]);

  // Scroll automatico quando arrivano nuovi messaggi
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div>
      {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
      <div ref={messagesEndRef} /> {/* Elemento sentinella */}
    </div>
  );
};
```

### Esempio 3: Click Outside Detection (SearchableSelect.tsx)

```typescript
import { useRef, useEffect } from 'react';

const SearchableSelect = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Verifica se il click è fuori dal container
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Aggiungi listener quando il dropdown è aperto
      document.addEventListener('mousedown', handleClickOutside);

      // IMPORTANTE: Rimuovi il listener quando il componente si smonta
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div ref={containerRef}>
      {/* Contenuto del dropdown */}
    </div>
  );
};
```

### Esempio 4: Scroll a Elemento Specifico

```typescript
import { useRef, useEffect } from 'react';

const MyComponent = () => {
  const listRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      const focusedItem = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({
          block: 'nearest',  // 'start' | 'center' | 'end' | 'nearest'
          behavior: 'smooth' // 'auto' | 'smooth'
        });
      }
    }
  }, [focusedIndex]);

  return (
    <ul ref={listRef}>
      {items.map((item, index) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};
```

---

## Event Listeners

### Aggiungere Event Listeners Globali

```typescript
import { useEffect } from 'react';

const MyComponent = () => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Chiudi modal, dropdown, ecc.
      }
    };

    // Aggiungi listener
    document.addEventListener('keydown', handleKeyPress);

    // IMPORTANTE: Rimuovi listener quando il componente si smonta
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []); // Array vuoto = esegui solo al mount/unmount
};
```

### Event Listener con Dipendenze

```typescript
useEffect(() => {
  const handleResize = () => {
    // Gestisci resize
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []); // Esegui solo al mount
```

---

## Manipolazione DOM Diretta

### Quando Usare document.querySelector / getElementById

⚠️ **ATTENZIONE**: In React, evita di usare `document.querySelector` o `getElementById` per elementi gestiti da React. Usa sempre `useRef` invece.

### Casi Legittimi

#### 1. Inizializzazione Root (index.tsx)

```typescript
// ✅ CORRETTO: Solo per il root element, prima del rendering React
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
```

#### 2. Elementi Fuori dal Controllo di React

```typescript
// ✅ CORRETTO: Per elementi non gestiti da React
useEffect(() => {
  // Modifica meta tag, title, ecc.
  document.title = 'Nuovo Titolo';

  // Aggiungi classe al body
  document.body.classList.add('modal-open');

  return () => {
    document.body.classList.remove('modal-open');
  };
}, []);
```

#### 3. Testing (App.test.tsx)

```typescript
// ✅ CORRETTO: Solo nei test
test('renders app', () => {
  const { container } = render(<App />);
  const appContainer = container.querySelector('.flex.h-screen');
  expect(appContainer).toBeInTheDocument();
});
```

### ❌ Casi da Evitare

```typescript
// ❌ SBAGLIATO: Non fare così in React
const MyComponent = () => {
  const handleClick = () => {
    const element = document.getElementById('my-element'); // ❌
    element?.classList.add('active');
  };

  return <div id="my-element">Contenuto</div>;
};

// ✅ CORRETTO: Usa useRef
const MyComponent = () => {
  const elementRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    elementRef.current?.classList.add('active'); // ✅
  };

  return <div ref={elementRef}>Contenuto</div>;
};
```

---

## Esempi Pratici dal Codice

### Esempio Completo: SearchableSelect

```typescript
import React, { useState, useRef, useEffect } from 'react';

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // 1. Riferimenti agli elementi DOM
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 2. Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // 3. Focus automatico
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 4. Scroll a elemento focalizzato
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedItem = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [focusedIndex, isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <input ref={inputRef} type="text" />
      {isOpen && (
        <ul ref={listRef} className="dropdown-list">
          {options.map((option, index) => (
            <li key={option}>{option}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## Best Practices

### ✅ DO (Fai)

1. **Usa `useRef` per riferimenti a elementi DOM**
2. **Pulisci sempre gli event listeners** nel cleanup di `useEffect`
3. **Usa optional chaining** (`?.`) quando accedi a `ref.current`
4. **Typea correttamente i ref** (`useRef<HTMLDivElement>(null)`)

### ❌ DON'T (Non Fare)

1. **Non usare `document.querySelector`** per elementi React
2. **Non dimenticare di rimuovere event listeners**
3. **Non accedere a `ref.current` durante il rendering** (solo in `useEffect` o handlers)
4. **Non modificare direttamente il DOM** quando React gestisce l'elemento

---

## Tipi TypeScript Comuni

```typescript
// Elementi HTML comuni
useRef<HTMLDivElement>(null);
useRef<HTMLInputElement>(null);
useRef<HTMLButtonElement>(null);
useRef<HTMLUListElement>(null);
useRef<HTMLLIElement>(null);
useRef<HTMLTextAreaElement>(null);
useRef<HTMLSelectElement>(null);
useRef<HTMLFormElement>(null);
```

---

## Riepilogo

| Scenario               | Soluzione                                  | Esempio                                    |
| ---------------------- | ------------------------------------------ | ------------------------------------------ |
| Riferimento a elemento | `useRef`                                   | `const ref = useRef<HTMLDivElement>(null)` |
| Focus automatico       | `ref.current?.focus()`                     | Vedi SearchableSelect                      |
| Scroll automatico      | `ref.current?.scrollIntoView()`            | Vedi Chatbot                               |
| Click outside          | `document.addEventListener` + `contains()` | Vedi SearchableSelect                      |
| Root element           | `document.getElementById('root')`          | Vedi index.tsx                             |
| Meta tags, title       | `document.title`, `document.body`          | Solo per elementi non-React                |

---

## Domande Frequenti

**Q: Quando devo usare `useRef` vs `document.querySelector`?**  
A: Usa sempre `useRef` per elementi gestiti da React. Usa `document.querySelector` solo per elementi completamente fuori dal controllo di React (es. elementi aggiunti da librerie esterne).

**Q: Perché devo pulire gli event listeners?**  
A: Per evitare memory leaks. Se non rimuovi i listener, rimangono attivi anche dopo che il componente è stato smontato.

**Q: Posso usare `ref.current` durante il rendering?**  
A: No. `ref.current` è `null` durante il rendering. Usalo solo in `useEffect` o in event handlers.

**Q: Come faccio a sapere se un ref è ancora valido?**  
A: Usa optional chaining: `ref.current?.method()`. Se `ref.current` è `null`, l'espressione ritorna `undefined` senza errori.




