'use client';

import { useState, useCallback } from 'react';
import PokeBallButton from './PokeBallButton';
import AvatarPicker from './AvatarPicker';
import { Difficulty, TimerOption, Player } from '@/lib/game-state';

interface RemoteLobbyProps {
  onCreateOffer: () => Promise<string>;
  onAcceptOffer: (offer: string) => Promise<string>;
  onAcceptAnswer: (answer: string) => Promise<void>;
  connected: boolean;
  onStart: (config: {
    players: [Player, Player];
    difficulty: Difficulty;
    timerDuration: TimerOption;
    isHost: boolean;
  }) => void;
  onBack: () => void;
}

export default function RemoteLobby({
  onCreateOffer,
  onAcceptOffer,
  onAcceptAnswer,
  connected,
  onStart,
  onBack,
}: RemoteLobbyProps) {
  const [step, setStep] = useState<'role' | 'host-waiting' | 'join' | 'join-waiting' | 'connected' | 'settings'>('role');
  const [offerCode, setOfferCode] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timer, setTimer] = useState<TimerOption>(60);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [copying, setCopying] = useState(false);

  const handleHost = useCallback(async () => {
    setIsHost(true);
    setError('');
    try {
      const offer = await onCreateOffer();
      setOfferCode(offer);
      setStep('host-waiting');
    } catch {
      setError('Failed to create connection. Please try again.');
    }
  }, [onCreateOffer]);

  const handleJoinSubmit = useCallback(async () => {
    setError('');
    try {
      const answer = await onAcceptOffer(inputCode);
      setAnswerCode(answer);
      setStep('join-waiting');
    } catch {
      setError('Invalid connection code. Please try again.');
    }
  }, [onAcceptOffer, inputCode]);

  const handleHostAcceptAnswer = useCallback(async () => {
    setError('');
    try {
      await onAcceptAnswer(inputCode);
    } catch {
      setError('Invalid answer code. Please try again.');
    }
  }, [onAcceptAnswer, inputCode]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, []);

  // When connected, move to settings
  if (connected && step !== 'settings') {
    setStep('settings');
  }

  const handleStart = () => {
    if (!nickname.trim()) return;
    // In real implementation, exchange player info via WebRTC
    const localPlayer: Player = {
      id: isHost ? 'p1' : 'p2',
      nickname: nickname.trim(),
      avatarId,
      score: 0,
    };
    const remotePlayer: Player = {
      id: isHost ? 'p2' : 'p1',
      nickname: 'Remote Player',
      avatarId: avatarId === 1 ? 2 : 1,
      score: 0,
    };
    const players: [Player, Player] = isHost
      ? [localPlayer, remotePlayer]
      : [remotePlayer, localPlayer];
    onStart({ players, difficulty, timerDuration: timer, isHost });
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto animate-fade-in">
      <h1 className="text-2xl font-black text-pokemon-blue">Remote Play</h1>
      <div className="pokeball-divider" />

      {step === 'role' && (
        <div className="space-y-4 w-full animate-slide-up">
          <PokeBallButton onClick={handleHost} variant="red" size="lg" className="w-full">
            Create Room (Host)
          </PokeBallButton>
          <PokeBallButton onClick={() => { setIsHost(false); setStep('join'); }} variant="blue" size="lg" className="w-full">
            Join Room
          </PokeBallButton>
          <PokeBallButton onClick={onBack} variant="gray" size="md" className="w-full">
            Back
          </PokeBallButton>
        </div>
      )}

      {step === 'host-waiting' && (
        <div className="space-y-4 w-full animate-slide-up">
          <p className="text-sm text-pokemon-dark text-center">Share this code with your friend:</p>
          <div className="bg-gray-100 rounded-lg p-3 break-all text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
            {offerCode}
          </div>
          <PokeBallButton onClick={() => handleCopy(offerCode)} variant="blue" size="sm" className="w-full">
            {copying ? 'Copied!' : 'Copy Code'}
          </PokeBallButton>
          <div className="pokeball-divider" />
          <p className="text-sm text-pokemon-dark text-center">Paste your friend&apos;s answer code:</p>
          <textarea
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Paste answer code here..."
            className="w-full px-3 py-2 rounded-lg border-2 border-pokemon-dark text-xs font-mono h-24 resize-none text-gray-700"
          />
          <PokeBallButton onClick={handleHostAcceptAnswer} variant="red" size="md" className="w-full" disabled={!inputCode.trim()}>
            Connect
          </PokeBallButton>
        </div>
      )}

      {step === 'join' && (
        <div className="space-y-4 w-full animate-slide-up">
          <p className="text-sm text-pokemon-dark text-center">Paste the host&apos;s connection code:</p>
          <textarea
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Paste connection code here..."
            className="w-full px-3 py-2 rounded-lg border-2 border-pokemon-dark text-xs font-mono h-24 resize-none text-gray-700"
          />
          <PokeBallButton onClick={handleJoinSubmit} variant="red" size="md" className="w-full" disabled={!inputCode.trim()}>
            Generate Answer
          </PokeBallButton>
          <PokeBallButton onClick={() => setStep('role')} variant="gray" size="sm" className="w-full">
            Back
          </PokeBallButton>
        </div>
      )}

      {step === 'join-waiting' && (
        <div className="space-y-4 w-full animate-slide-up">
          <p className="text-sm text-pokemon-dark text-center">Send this answer code back to the host:</p>
          <div className="bg-gray-100 rounded-lg p-3 break-all text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
            {answerCode}
          </div>
          <PokeBallButton onClick={() => handleCopy(answerCode)} variant="blue" size="sm" className="w-full">
            {copying ? 'Copied!' : 'Copy Answer Code'}
          </PokeBallButton>
          <p className="text-sm text-pokemon-gray text-center">Waiting for host to connect...</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {step === 'settings' && (
        <div className="space-y-4 w-full animate-slide-up">
          <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-center">
            <p className="text-green-700 font-bold">Connected!</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-pokemon-dark">Your Name</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your name..."
              maxLength={16}
              className="w-full px-4 py-2 rounded-lg border-2 border-pokemon-dark text-pokemon-dark bg-white outline-none focus:border-pokemon-blue"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-pokemon-dark">Your Avatar</label>
            <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
          </div>

          {isHost && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-pokemon-dark">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-full font-bold text-sm capitalize transition-all ${
                        difficulty === d ? 'bg-pokemon-blue text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-pokemon-dark">Timer</label>
                <div className="flex gap-2">
                  {([30, 60, 90] as TimerOption[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimer(t)}
                      className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${
                        timer === t ? 'bg-pokemon-blue text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <PokeBallButton onClick={handleStart} variant="red" size="lg" className="w-full" disabled={!nickname.trim()}>
            {isHost ? 'Start Game!' : 'Ready!'}
          </PokeBallButton>
        </div>
      )}

      {error && (
        <p className="text-sm text-pokemon-red font-bold">{error}</p>
      )}
    </div>
  );
}
