'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { searchPokemonNames } from '@/lib/pokedex';
import { MAX_GUESS_LENGTH } from '@/lib/net/protocol';

interface GuessInputProps {
  onGuess: (text: string) => void;
  disabled?: boolean;
}

/**
 * Guess box with a Pokémon-name dropdown. After the first letter it lists matching names
 * alphabetically; tapping one (or Enter on the highlighted one) submits it, so spelling never
 * decides the round.
 */
export default function GuessInput({ onGuess, disabled = false }: GuessInputProps) {
  const [text, setText] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  // Slightly longer than the host's per-guess cooldown, so a quick second guess waits in the
  // box instead of being dropped. The input stays enabled so the phone keyboard stays open.
  const lastSubmitRef = useRef(0);
  const suggestions = useMemo(() => searchPokemonNames(text, 8), [text]);
  const showList = open && suggestions.length > 0 && !disabled;

  const submit = (value: string, at: number) => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    if (at - lastSubmitRef.current < 1300) {
      setText(trimmed);
      setOpen(false);
      return;
    }
    lastSubmitRef.current = at;
    onGuess(trimmed);
    setText('');
    setOpen(false);
    setHighlight(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <form
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        submit(showList ? suggestions[highlight] : text, e.timeStamp);
      }}
    >
      {showList && (
        // Opens upwards: the phone keyboard covers whatever is below the input.
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching Pokémon"
          className="absolute bottom-full mb-1 left-0 right-0 z-20 max-h-64 overflow-y-auto bg-white rounded-xl border-3 border-pokemon-dark shadow-xl"
        >
          {suggestions.map((name, i) => (
            <li key={name} role="option" id={`${listId}-${i}`} aria-selected={i === highlight}>
              <button
                type="button"
                // Keep focus in the input so the keyboard stays up on phones.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => submit(name, e.timeStamp)}
                className={`w-full text-left px-3 py-2.5 text-sm font-body font-semibold ${
                  i === highlight ? 'bg-pokemon-blue text-white' : 'text-pokemon-dark hover:bg-gray-100'
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex rounded-xl border-3 border-pokemon-dark overflow-hidden bg-white">
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${highlight}` : undefined}
          aria-label="Your guess"
          value={text}
          maxLength={MAX_GUESS_LENGTH}
          disabled={disabled}
          placeholder={disabled ? 'Waiting…' : 'Start typing a Pokémon…'}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="send"
          onChange={(e) => {
            setText(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 px-3 py-2.5 text-base font-body text-pokemon-dark outline-none disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-4 bg-pokemon-red text-white font-bold text-sm font-body hover:bg-pokemon-red-dark disabled:opacity-50 transition-colors"
        >
          Guess
        </button>
      </div>
    </form>
  );
}
