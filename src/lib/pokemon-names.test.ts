import { describe, expect, it } from 'vitest';
import data from '@/data/pokemon-names-i18n.json';
import { normalizeName } from './pokedex';
import { displayName, isCorrectGuessAnyLanguage, localizedName, searchNames, type NameData } from './pokemon-names';

const names = data as NameData;
const pikachu = { id: 25, name: 'Pikachu' };
const charizard = { id: 6, name: 'Charizard' };

describe('normalizeName across scripts', () => {
  it('folds katakana, hiragana and full-width forms together', () => {
    expect(normalizeName('ピカチュウ')).toBe(normalizeName('ぴかちゅう'));
    expect(normalizeName('ﾋﾟｶﾁｭｳ')).toBe(normalizeName('ピカチュウ'));
    expect(normalizeName('ＰＩＫＡＣＨＵ')).toBe('pikachu');
  });

  it('keeps Hangul and Han characters, and drops accents and punctuation', () => {
    expect(normalizeName('피카츄')).toBe('피카츄');
    expect(normalizeName('皮卡丘')).toBe('皮卡丘');
    expect(normalizeName('Pikachū')).toBe('pikachu');
    expect(normalizeName('Porygon-Z')).toBe('porygonz');
  });

  it('keeps voiced kana distinct', () => {
    expect(normalizeName('ガ')).not.toBe(normalizeName('カ'));
  });
});

describe('judging in any language', () => {
  it.each(['Pikachu', 'pikachū', 'ピカチュウ', 'ぴかちゅう', 'ﾋﾟｶﾁｭｳ', '피카츄', '皮卡丘', ' ピカチュウ '])(
    'accepts %s for Pikachu',
    (guess) => {
      expect(isCorrectGuessAnyLanguage(guess, pikachu, names)).toBe(true);
    },
  );

  it('accepts French, German, rōmaji and Chinese names for other Pokémon', () => {
    expect(isCorrectGuessAnyLanguage('Dracaufeu', charizard, names)).toBe(true);
    expect(isCorrectGuessAnyLanguage('glurak', charizard, names)).toBe(true);
    expect(isCorrectGuessAnyLanguage('Lizardon', charizard, names)).toBe(true);
    expect(isCorrectGuessAnyLanguage('妙蛙種子', { id: 1, name: 'Bulbasaur' }, names)).toBe(true);
    expect(isCorrectGuessAnyLanguage('妙蛙种子', { id: 1, name: 'Bulbasaur' }, names)).toBe(true);
  });

  it('rejects other Pokémon, empty guesses and a missing data file', () => {
    expect(isCorrectGuessAnyLanguage('ライチュウ', pikachu, names)).toBe(false);
    expect(isCorrectGuessAnyLanguage('', pikachu, names)).toBe(false);
    expect(isCorrectGuessAnyLanguage('ピカチュウ', pikachu, null)).toBe(false);
    expect(isCorrectGuessAnyLanguage('Pikachu', pikachu, null)).toBe(true);
  });

  it('keeps forms distinct from their species in every language', () => {
    const mega = { id: 10034, name: 'Mega Charizard X' };
    expect(localizedName(10034, 'ja', names)).toBe('Mega リザードン X');
    expect(isCorrectGuessAnyLanguage('Mega Lizardon X', mega, names)).toBe(true);
    expect(isCorrectGuessAnyLanguage('Mega リザードン X', mega, names)).toBe(true);
    expect(isCorrectGuessAnyLanguage('リザードン', mega, names)).toBe(false);
  });
});

describe('localized names', () => {
  it('has a row for every species and falls back to English', () => {
    expect(names.names).toHaveLength(1025);
    expect(names.names.every((row) => row.length === names.languages.length)).toBe(true);
    expect(displayName(25, 'Pikachu', 'ja', names)).toBe('ピカチュウ');
    expect(displayName(25, 'Pikachu', 'fr', names)).toBe('Pikachu');
    expect(displayName(25, 'Pikachu', 'en', names)).toBe('Pikachu');
    expect(displayName(25, 'Pikachu', 'ja', null)).toBe('Pikachu');
  });
});

describe('suggestions', () => {
  it('offers English names alone for English or while loading', () => {
    expect(searchNames('pika', 'en', names)[0]).toEqual({ text: 'Pikachu' });
    expect(searchNames('ピカ', 'ja', null)).toEqual([]);
  });

  it('offers the chosen language with the English name alongside', () => {
    expect(searchNames('ピカ', 'ja', names)).toContainEqual({ text: 'ピカチュウ', english: 'Pikachu' });
    expect(searchNames('ぴかち', 'ja', names)).toContainEqual({ text: 'ピカチュウ', english: 'Pikachu' });
    expect(searchNames('피카', 'ko', names)).toContainEqual({ text: '피카츄', english: 'Pikachu' });
  });

  it('mixes English and localized matches within the limit', () => {
    const results = searchNames('p', 'fr', names, 8);
    expect(results).toHaveLength(8);
    expect(results.some((r) => r.english)).toBe(true);
    expect(results.some((r) => !r.english)).toBe(true);
  });
});
