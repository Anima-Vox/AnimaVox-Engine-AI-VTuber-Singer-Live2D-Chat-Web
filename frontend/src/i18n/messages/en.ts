import type { Messages } from './zh-CN';

/** English UI text. Characters are referred to by their English names. */
export const en: Messages = {
  nav: {
    menu: 'Main menu',
    conversations: { label: 'Chats', title: 'Chat history' },
    characters: { label: 'Characters', title: 'Switch character' },
    persona: { label: 'Persona', title: 'Persona prompt' },
    api: { label: 'API', title: 'Model & API' },
    settings: { label: 'Settings', title: 'Settings' },
  },
  conversations: {
    title: (character) => `Chats with ${character.englishName}`,
    new: 'New chat',
    untitled: 'New chat',
    empty: 'Your chat will be saved here after your first message.',
    delete: 'Delete chat',
    deleteNamed: (title) => `Delete chat: ${title}`,
    confirmDelete: 'Delete',
    yesterday: 'Yesterday',
  },
  characters: {
    title: 'Characters',
    official: 'Official',
    create: 'Create your own character',
    comingSoon: 'Open-source engine feature, coming soon',
  },
  persona: {
    title: 'Persona prompt',
    locked: (character) =>
      `${character.englishName} is an official character. The persona is maintained by the official team, can't be edited, and isn't shown in the app.`,
    editorSoon: 'Persona editor coming soon.',
    name: 'Name',
    englishName: 'English name',
    tagline: 'About',
    customNote:
      'Characters you create yourself can have their persona written here (open-source engine feature, coming soon).',
  },
  api: {
    title: 'Model & API',
    locked: (character) =>
      `${character.englishName} always uses the official model and API. No key is needed, and you can't enter your own.`,
    customSoon: 'Custom API settings coming soon.',
    channel: 'Chat channel',
    channels: { mock: 'Demo (in-browser mock backend)', http: 'Own backend' },
    backendUrl: 'Backend URL',
    customNote:
      'Characters you create yourself can connect their own model and API (open-source engine feature, coming soon).',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    history: 'Chat history',
    historyValue: 'Stored only in this browser',
    engine: 'Engine',
    engineValue: 'AnimaVox',
    version: 'Version',
    versionValue: 'Text chat 0.2',
  },
  chat: {
    demoBadge: 'Demo mode: replies come from a mock backend',
    you: 'You said',
    says: (character) => `${character.englishName} said`,
    typing: (character) => `${character.englishName} is typing`,
    starters: 'Ways to start',
    placeholder: (character) => `Say something to ${character.englishName}…`,
    input: 'Message input',
    send: 'Send',
    stop: 'Stop waiting for the reply',
    hint: 'Enter to send, Shift + Enter for a new line',
  },
  notice: {
    failed: (reason) => `No reply received. ${reason}`,
    retry: 'Retry',
    close: 'Dismiss',
    server: (status, detail) =>
      `Server error${status ? ` (${status})` : ''}${detail ? `: ${detail}` : '.'}`,
    reasons: {
      unanswered: "This message hasn't received a reply yet.",
      history: "Couldn't read the local chat history. You can still send new messages.",
      aborted: 'Stopped waiting for the reply.',
      timeout: 'No response for too long. Please try again later.',
      network: "Can't reach the server. Check your network or make sure the backend is running.",
      invalid_response:
        'The server returned data in the wrong format. Please ask the backend team to check.',
      unknown: 'Something went wrong. Please try again.',
    },
  },
  stage: {
    label: (character) => `Portrait of ${character.englishName}`,
    online: 'Online',
    typing: 'Typing…',
    live2dPending: 'Live2D in preparation',
  },
};
