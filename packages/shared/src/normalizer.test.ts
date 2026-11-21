import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  normalizeQuery,
  normalizeRUToken,
  collapseRepeatedLetters,
  stripHonorifics
} from './normalizer';

describe('Roman Urdu Normalizer & Language Detector (F1 Fix)', () => {
  describe('detectLanguage (token-based)', () => {
    it('correctly classifies plain English sentences without false positives from substrings', () => {
      // Substring trap words: "this" has "thi", "that" has "tha", "chair" has "hai", "snapshot" has "aap"
      expect(detectLanguage('is this the one that works')).toBe('en');
      expect(detectLanguage('please sit on the chair')).toBe('en');
      expect(detectLanguage('take a snapshot of the screen')).toBe('en');
      expect(detectLanguage('what is the minimum cgpa to graduate')).toBe('en');
      expect(detectLanguage('tell me about CS-115')).toBe('en');
    });

    it('correctly classifies Roman Urdu sentences', () => {
      expect(detectLanguage('kya haal hai')).toBe('ru');
      expect(detectLanguage('graduate hone ke liye kitna cgpa chahiye')).toBe('ru');
      expect(detectLanguage('fail ho gaya kya karun')).toBe('ru');
      expect(detectLanguage('bohat tension ho rahi hai')).toBe('ru');
      expect(detectLanguage('fakhra aftab kaun hain')).toBe('ru');
      expect(detectLanguage('prereq pass nahi hua to kya hoga')).toBe('ru');
    });

    it('classifies short Roman Urdu questions correctly', () => {
      expect(detectLanguage('cgpa kitna hai')).toBe('ru');
      expect(detectLanguage('kaun hai')).toBe('ru');
      expect(detectLanguage('help chahiye')).toBe('ru');
    });
  });

  describe('normalizeQuery & collapseRepeatedLetters', () => {
    it('collapses repeated letters to max 2', () => {
      expect(collapseRepeatedLetters('sooooo')).toBe('soo');
      expect(collapseRepeatedLetters('bhaaaai')).toBe('bhaai');
      expect(collapseRepeatedLetters('pleeeease')).toBe('pleease');
    });

    it('maps variant Roman Urdu spellings to canonical forms', () => {
      expect(normalizeRUToken('kia')).toBe('kya');
      expect(normalizeRUToken('kese')).toBe('kaise');
      expect(normalizeRUToken('nhi')).toBe('nahi');
      expect(normalizeRUToken('chahye')).toBe('chahiye');
      expect(normalizeRUToken('boht')).toBe('bohat');
      expect(normalizeRUToken('fel')).toBe('fail');
    });

    it('normalises full queries properly', () => {
      expect(normalizeQuery('kia haal hay bhai')).toBe('kya haal hai bhai');
      expect(normalizeQuery('bht tension hay')).toBe('bohat tension hai');
    });
  });

  describe('stripHonorifics', () => {
    it('removes titles like Dr., Engr., Ms., Prof.', () => {
      expect(stripHonorifics('Dr. Fakhra Aftab')).toBe('fakhra aftab');
      expect(stripHonorifics('Prof. Dr. Muhammad Khurram')).toBe('muhammad khurram');
      expect(stripHonorifics('Ms. Tahreem')).toBe('tahreem');
      expect(stripHonorifics('Mr. Engr. Ali Akhtar')).toBe('ali akhtar');
    });
  });
});
