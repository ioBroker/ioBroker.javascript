declare module '*.png';
declare module '*.svg';
declare module '*.jpeg';
declare module '*.jpg';
declare module '*.md';
declare module '*.scss';

// moment ships its locales as plain JS without declarations, so the side-effect
// imports that register them need an ambient module (TS 6 reports TS2882 otherwise).
declare module 'moment/locale/*';
