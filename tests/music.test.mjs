import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSong, exportMidi, validSong, updateNote } from '../src/music-score.js';

test('the built-in Wii lobby arrangement is valid and exports as a multi-track MIDI file', () => {
  const song = defaultSong();
  assert.equal(validSong(song), true);
  assert.equal(song.tracks.length, 4);
  assert.ok(song.tracks.every(track => track.notes.length > 0));
  const midi = exportMidi(song);
  assert.deepEqual([...midi.slice(0, 4)], [0x4d, 0x54, 0x68, 0x64]);
  assert.ok(midi.length > 1000);
});

test('note edits clamp safe timing and reject collisions or pitches outside a track', () => {
  const song = defaultSong();
  const note = song.tracks[0].notes[0];
  assert.equal(updateNote(song, 'keys', note.id, { step: -10, length: 99 }), true);
  assert.equal(note.step, 0);
  assert.equal(note.length, 8);
  assert.equal(updateNote(song, 'keys', note.id, { pitch: 36 }), false);
  assert.equal(validSong(song), true);
});

test('invalid persisted scores cannot be exported', () => {
  const song = defaultSong();
  song.bpm = 500;
  assert.equal(validSong(song), false);
  assert.throws(() => exportMidi(song), /Invalid music score/);
});
